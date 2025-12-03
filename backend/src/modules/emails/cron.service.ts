import { prisma } from '../../db/client';
import { logger } from '../../config/logger';
import { sendDailyDigest, sendWeeklyDigest, sendFollowupReminders } from './email.service';

/**
 * Process all workspaces and send digests based on their preferences
 * This should be called by a cron job (e.g., every hour)
 */
export const processScheduledDigests = async () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  logger.info({ currentHour, currentMinute, currentDay }, 'Processing scheduled digests');

  // Get all active workspaces
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      timezone: true,
      dailyDigestEnabled: true,
      dailyDigestTime: true,
      weeklyDigestEnabled: true,
      weeklyDigestDay: true,
      weeklyDigestTime: true,
      followupRemindersEnabled: true,
    },
  });

  const results = {
    dailyDigests: { sent: 0, skipped: 0, failed: 0 },
    weeklyDigests: { sent: 0, skipped: 0, failed: 0 },
    followupReminders: { sent: 0, skipped: 0, failed: 0 },
  };

  for (const workspace of workspaces) {
    try {
      // Check if it's time for daily digest
      if (workspace.dailyDigestEnabled && workspace.dailyDigestTime) {
        const [digestHour, digestMinute] = workspace.dailyDigestTime.split(':').map(Number);
        
        // Send if current time matches (within the same hour)
        if (currentHour === digestHour && currentMinute >= digestMinute && currentMinute < digestMinute + 5) {
          try {
            const result = await sendDailyDigest(workspace.id);
            results.dailyDigests.sent += result.sent;
            results.dailyDigests.failed += result.failed;
            logger.info({ workspaceId: workspace.id }, 'Daily digest sent');
          } catch (error) {
            results.dailyDigests.failed++;
            logger.error({ error, workspaceId: workspace.id }, 'Failed to send daily digest');
          }
        } else {
          results.dailyDigests.skipped++;
        }
      } else {
        results.dailyDigests.skipped++;
      }

      // Check if it's time for weekly digest
      if (workspace.weeklyDigestEnabled && workspace.weeklyDigestDay && workspace.weeklyDigestTime) {
        const [digestHour, digestMinute] = workspace.weeklyDigestTime.split(':').map(Number);
        
        // Send if current day and time matches
        if (
          currentDay === workspace.weeklyDigestDay &&
          currentHour === digestHour &&
          currentMinute >= digestMinute &&
          currentMinute < digestMinute + 5
        ) {
          try {
            const result = await sendWeeklyDigest(workspace.id);
            results.weeklyDigests.sent += result.sent;
            results.weeklyDigests.failed += result.failed;
            logger.info({ workspaceId: workspace.id }, 'Weekly digest sent');
          } catch (error) {
            results.weeklyDigests.failed++;
            logger.error({ error, workspaceId: workspace.id }, 'Failed to send weekly digest');
          }
        } else {
          results.weeklyDigests.skipped++;
        }
      } else {
        results.weeklyDigests.skipped++;
      }

      // Send followup reminders (if enabled, check every hour)
      if (workspace.followupRemindersEnabled && currentMinute < 5) {
        try {
          const result = await sendFollowupReminders(workspace.id);
          results.followupReminders.sent += result.sent;
          results.followupReminders.failed += result.failed;
          logger.info({ workspaceId: workspace.id }, 'Followup reminders sent');
        } catch (error) {
          results.followupReminders.failed++;
          logger.error({ error, workspaceId: workspace.id }, 'Failed to send followup reminders');
        }
      } else {
        results.followupReminders.skipped++;
      }
    } catch (error) {
      logger.error({ error, workspaceId: workspace.id }, 'Error processing workspace digests');
    }
  }

  logger.info(results, 'Scheduled digests processing completed');
  return results;
};

