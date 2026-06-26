import { prisma } from '../../db/client';
import { writePlatformAudit } from './platform-audit';
import { PLATFORM_FEATURES, PlatformFeature } from '../../config/platform-features';

const SETTINGS_ID = 'global';
const TTL_MS = 60_000;

let cache: { value: Record<PlatformFeature, boolean>; expires: number } | null = null;

/** Build a fully-resolved flag map: every registry key => explicit boolean (missing => true). */
function resolve(features: unknown): Record<PlatformFeature, boolean> {
  const raw = (features && typeof features === 'object' ? features : {}) as Record<string, unknown>;
  const out = {} as Record<PlatformFeature, boolean>;
  for (const key of PLATFORM_FEATURES) {
    out[key] = raw[key] === false ? false : true; // opt-out: only explicit false disables
  }
  return out;
}

export function invalidateFeatureCache(): void {
  cache = null;
}

export async function getPlatformFeatures(): Promise<Record<PlatformFeature, boolean>> {
  if (cache && cache.expires > Date.now()) return cache.value;
  const doc = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  const value = resolve(doc?.features);
  cache = { value, expires: Date.now() + TTL_MS };
  return value;
}

export async function patchFeature(
  actorUserId: string,
  feature: PlatformFeature,
  enabled: boolean,
): Promise<Record<PlatformFeature, boolean>> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  const current = (existing?.features && typeof existing.features === 'object'
    ? existing.features
    : {}) as Record<string, unknown>;
  const nextFeatures = { ...current, [feature]: enabled };

  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, features: nextFeatures as any },
    update: { features: nextFeatures as any },
  });

  await writePlatformAudit(prisma, {
    actorUserId,
    action: 'platform.features.update',
    targetType: 'platformSettings',
    targetId: SETTINGS_ID,
    metadata: { feature, enabled },
  });

  invalidateFeatureCache();
  return resolve(nextFeatures);
}

export async function listWorkspacesWithFeatures(q: {
  q?: string;
  page: number;
  size: number;
}) {
  const where: any = { OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] };
  if (q.q) where.name = { contains: q.q, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.workspace.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (q.page - 1) * q.size,
      take: q.size,
      select: { id: true, name: true, aiFeaturesEnabled: true, tasksEnabled: true, revenueEnabled: true },
    }),
    prisma.workspace.count({ where }),
  ]);

  return { items, page: q.page, size: q.size, total };
}
