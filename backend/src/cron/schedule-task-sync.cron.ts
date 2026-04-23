import { processDailyScheduleSync } from '../modules/schedule/schedule-task-sync.service';
import { logger } from '../config/logger';

/**
 * Hourly cron job that checks if any workspace needs schedule-to-task sync at 8 AM
 * Should be triggered by external scheduler (node-cron, Vercel Crons, etc.)
 * or called manually via an internal endpoint
 */
export const handleDailyScheduleSyncCron = async () => {
  try {
    logger.info('Daily schedule sync cron triggered');
    const results = await processDailyScheduleSync();
    logger.info({ results }, 'Daily schedule sync cron completed');
  } catch (err) {
    logger.error({ err }, 'Daily schedule sync cron failed');
    // Don't throw — allow cron to report completion status independently
  }
};
