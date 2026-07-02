import { prisma } from '../../db/client';
import { writePlatformAudit } from './platform-audit';
import { dhakaDateBucket } from '../../middleware/usage-beat';
import { sendEmail } from '../../utils/email';
import { usageNudgeTemplate } from '../../utils/email-templates';

const SETTINGS_ID = 'global';

export interface UsageNudgeSettings {
  thresholdMinutes: number;
  windowDays: number;
  cooldownDays: number;
}

export const DEFAULT_USAGE_NUDGE: UsageNudgeSettings = {
  thresholdMinutes: 30,
  windowDays: 7,
  cooldownDays: 14,
};

function resolveSettings(raw: unknown): UsageNudgeSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    thresholdMinutes:
      typeof o.thresholdMinutes === 'number' ? o.thresholdMinutes : DEFAULT_USAGE_NUDGE.thresholdMinutes,
    windowDays: typeof o.windowDays === 'number' ? o.windowDays : DEFAULT_USAGE_NUDGE.windowDays,
    cooldownDays: typeof o.cooldownDays === 'number' ? o.cooldownDays : DEFAULT_USAGE_NUDGE.cooldownDays,
  };
}

export async function getUsageNudgeSettings(): Promise<UsageNudgeSettings> {
  const doc = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  return resolveSettings((doc as { usageNudge?: unknown } | null)?.usageNudge);
}

export async function updateUsageNudgeSettings(
  actorUserId: string,
  patch: Partial<UsageNudgeSettings>,
): Promise<UsageNudgeSettings> {
  const current = await getUsageNudgeSettings();
  const next = { ...current, ...patch };
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, usageNudge: next as any },
    update: { usageNudge: next as any },
  });
  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'platform.usageNudge.settings.update',
    targetType: 'platformSettings',
    targetId: SETTINGS_ID,
    metadata: patch,
  });
  return next;
}

/** Last N Dhaka date buckets, today inclusive. */
function windowDates(windowDays: number, now: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    dates.push(dhakaDateBucket(new Date(now.getTime() - i * 86_400_000)));
  }
  return dates;
}

export interface UsageRow {
  id: string;
  email: string;
  name: string | null;
  activeMinutes: number;
  lastActiveDate: string | null;
  isLowUsage: boolean;
  lastNudgedAt: Date | null;
  inCooldown: boolean;
}

export async function listUsage(q: {
  windowDays?: number;
  lowOnly?: boolean;
  page: number;
  size: number;
}) {
  const settings = await getUsageNudgeSettings();
  const windowDays = q.windowDays ?? settings.windowDays;
  const dates = windowDates(windowDays);
  const cooldownCutoff = new Date(Date.now() - settings.cooldownDays * 86_400_000);

  const [users, usage] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ disabledAt: null }, { disabledAt: { isSet: false } }] },
      select: { id: true, email: true, name: true, lastNudgedAt: true },
      orderBy: { email: 'asc' },
    }),
    prisma.userDailyUsage.findMany({
      where: { date: { in: dates } },
      select: { userId: true, date: true, activeMinutes: true },
    }),
  ]);

  const byUser = new Map<string, { minutes: number; lastDate: string | null }>();
  for (const row of usage) {
    const agg = byUser.get(row.userId) ?? { minutes: 0, lastDate: null };
    agg.minutes += row.activeMinutes;
    if (agg.lastDate === null || row.date > agg.lastDate) agg.lastDate = row.date;
    byUser.set(row.userId, agg);
  }

  let items: UsageRow[] = users.map((u) => {
    const agg = byUser.get(u.id) ?? { minutes: 0, lastDate: null };
    const minutes = Math.round(agg.minutes);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      activeMinutes: minutes,
      lastActiveDate: agg.lastDate,
      isLowUsage: minutes < settings.thresholdMinutes,
      lastNudgedAt: u.lastNudgedAt,
      inCooldown: u.lastNudgedAt !== null && u.lastNudgedAt > cooldownCutoff,
    };
  });

  if (q.lowOnly) items = items.filter((i) => i.isLowUsage);
  const total = items.length;
  const start = (q.page - 1) * q.size;
  return { items: items.slice(start, start + q.size), page: q.page, size: q.size, total, settings, windowDays };
}

export const DEFAULT_NUDGE_SUBJECT = 'Checking in from BrainScale';
export const DEFAULT_NUDGE_BODY = usageNudgeTemplate({ name: '{{name}}' }).text;

function fill(template: string, name: string): string {
  return template.replaceAll('{{name}}', name);
}

/** Plain text -> minimal HTML paragraphs (for custom bodies). */
function textToHtml(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = esc.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.6;">${paragraphs}</div>`;
}

export async function sendUsageNudges(
  actorUserId: string,
  input: { userIds: string[]; subject?: string; body?: string },
): Promise<{ sent: string[]; skipped: string[]; failed: string[] }> {
  const settings = await getUsageNudgeSettings();
  const cooldownCutoff = new Date(Date.now() - settings.cooldownDays * 86_400_000);
  const users = await prisma.user.findMany({
    where: { id: { in: input.userIds } },
    select: { id: true, email: true, name: true, lastNudgedAt: true },
  });

  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const user of users) {
    if (user.lastNudgedAt !== null && user.lastNudgedAt > cooldownCutoff) {
      skipped.push(user.id);
      continue;
    }
    const name = user.name || 'there';
    try {
      if (input.body || input.subject) {
        const bodyText = fill(input.body ?? DEFAULT_NUDGE_BODY, name);
        await sendEmail({
          to: user.email,
          subject: fill(input.subject ?? DEFAULT_NUDGE_SUBJECT, name),
          html: textToHtml(bodyText),
          text: bodyText,
        });
      } else {
        const t = usageNudgeTemplate({ name });
        await sendEmail({ to: user.email, subject: t.subject, html: t.html, text: t.text });
      }
      await prisma.user.update({ where: { id: user.id }, data: { lastNudgedAt: new Date() } });
      sent.push(user.id);
    } catch {
      failed.push(user.id);
    }
  }

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'platform.usageNudge.send',
    targetType: 'user',
    metadata: { sent, skipped, failed, custom: Boolean(input.subject || input.body) },
  });

  return { sent, skipped, failed };
}
