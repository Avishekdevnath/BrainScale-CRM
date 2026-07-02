import { Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { logger } from '../config/logger';
import { AuthRequest } from './auth-guard';

const BEAT_INTERVAL_MIN = 5;
const MAX_CREDIT_MIN = 5;

// In-memory throttle: userId -> last beat epoch ms. Cold-start reset is harmless
// (worst case one extra DB read; the DB-level elapsed check still throttles credit).
const lastBeatMemo = new Map<string, number>();

export function __clearBeatMemo(): void {
  lastBeatMemo.clear();
}

/** "YYYY-MM-DD" for the given instant in Asia/Dhaka. */
export function dhakaDateBucket(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(now);
}

export async function recordBeat(userId: string, now: Date = new Date()): Promise<void> {
  const date = dhakaDateBucket(now);
  const existing = await prisma.userDailyUsage.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!existing) {
    await prisma.userDailyUsage.create({
      data: { userId, date, activeMinutes: MAX_CREDIT_MIN, lastHeartbeatAt: now },
    });
    return;
  }
  const elapsedMin = (now.getTime() - existing.lastHeartbeatAt.getTime()) / 60_000;
  if (elapsedMin < BEAT_INTERVAL_MIN) return;
  const credit = Math.min(elapsedMin, MAX_CREDIT_MIN);
  await prisma.userDailyUsage.update({
    where: { id: existing.id },
    data: { activeMinutes: { increment: credit }, lastHeartbeatAt: now },
  });
}

/**
 * Piggybacks usage tracking on authenticated API traffic. Runs after the
 * response finishes (authGuard has populated req.user by then). Fire-and-forget:
 * never blocks or fails the request.
 */
export function usageBeat(req: AuthRequest, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const userId = req.user?.sub;
    if (!userId) return;
    const nowMs = Date.now();
    const last = lastBeatMemo.get(userId);
    if (last !== undefined && nowMs - last < BEAT_INTERVAL_MIN * 60_000) return;
    lastBeatMemo.set(userId, nowMs);
    void recordBeat(userId).catch((err) =>
      logger.warn({ err, userId }, 'usage beat failed'),
    );
  });
  next();
}
