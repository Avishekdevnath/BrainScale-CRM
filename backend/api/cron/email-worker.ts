import { processEmailBatch } from '../../src/modules/emails/email-worker';
import { createWorkerLock } from '../../src/modules/emails/email-worker-lock';
import { logger } from '../../src/config/logger';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel expects response within 10 seconds
export const maxDuration = 9; // Safety margin (must complete in < 9s)

/**
 * Email queue worker cron job
 * Runs every 5 seconds via Vercel Cron
 * Uses distributed lock to prevent concurrent execution
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const lock = createWorkerLock();

  try {
    // Verify cron secret
    const cronSecret = req.headers['x-cron-secret'] as string | undefined;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const expectedSecret = process.env.CRON_SECRET;
    const hasSecret = Boolean(expectedSecret && expectedSecret.trim());
    const isAuthorized = hasSecret
      ? (cronSecret === expectedSecret || bearerToken === expectedSecret)
      : process.env.NODE_ENV !== 'production';

    if (!isAuthorized) {
      logger.warn('Unauthorized cron request');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Try to acquire lock (prevents concurrent execution)
    const lockAcquired = await lock.acquire();
    if (!lockAcquired) {
      // Another worker is processing, skip this invocation
      logger.debug('Could not acquire lock, another worker is processing');
      res.status(200).json({
        success: true,
        skipped: true,
        reason: 'Another worker is processing',
      });
      return;
    }

    try {
      // Process batch (within 8-second timeout safety margin)
      const result = await processEmailBatch();

      res.status(200).json({
        success: true,
        locked: true,
        ...result,
      });
      return;
    } finally {
      // Always release lock
      await lock.release();
    }
  } catch (error: any) {
    logger.error({ error }, 'Cron worker error');
    await lock.release().catch(() => {}); // Best effort cleanup

    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
    return;
  }
}
