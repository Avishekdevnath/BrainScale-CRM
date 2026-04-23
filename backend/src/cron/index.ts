import { logger } from '../config/logger';
import { handleDailyScheduleSyncCron } from './schedule-task-sync.cron';

/**
 * Initialize all cron jobs
 * Call this from app.ts after server starts
 */
export const initializeCronJobs = async () => {
  logger.info('Initializing cron jobs...');

  // Setup hourly check for daily schedule sync
  // Note: This uses a simple interval; for production consider node-cron or Vercel Crons
  setInterval(() => {
    handleDailyScheduleSyncCron().catch((err) => {
      logger.error({ err }, 'Uncaught error in schedule sync cron');
    });
  }, 60 * 60 * 1000); // Every 60 minutes

  logger.info('Cron jobs initialized');
};

export { handleDailyScheduleSyncCron };
