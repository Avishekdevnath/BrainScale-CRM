import { prisma } from '../../db/client';
import { logger } from '../../config/logger';
import { sendDailyDigest, sendWeeklyDigest, sendFollowupReminders } from './email.service';
import { createNotification } from '../notifications/notification.service';

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

        // Fire in-app notifications for due-soon and overdue follow-ups
        try {
          const nowTime = new Date();
          const in24h = new Date(nowTime.getTime() + 24 * 60 * 60 * 1000);

          // Due soon: dueAt between now and +24h
          const dueSoonFollowups = await prisma.followup.findMany({
            where: {
              workspaceId: workspace.id,
              status: 'PENDING',
              dueAt: { gte: nowTime, lte: in24h },
              assignedTo: { not: null },
            },
            include: {
              student: { select: { name: true } },
              group: { select: { name: true } },
              assignee: { select: { userId: true } },
            },
          });

          for (const f of dueSoonFollowups) {
            if (f.assignee) {
              await createNotification({
                workspaceId: workspace.id,
                userId: f.assignee.userId,
                type: 'FOLLOWUP_DUE_SOON',
                title: 'Follow-up Due Soon',
                body: `Follow-up for ${f.student.name} in ${f.group.name} is due within 24 hours`,
                meta: {
                  entityId: f.id,
                  entityType: 'followup',
                  studentName: f.student.name,
                  groupName: f.group.name,
                  dueAt: f.dueAt.toISOString(),
                },
              });
            }
          }

          // Overdue: dueAt < now
          const overdueFollowups = await prisma.followup.findMany({
            where: {
              workspaceId: workspace.id,
              status: 'PENDING',
              dueAt: { lt: nowTime },
              assignedTo: { not: null },
            },
            include: {
              student: { select: { name: true } },
              group: { select: { name: true } },
              assignee: { select: { userId: true } },
            },
          });

          for (const f of overdueFollowups) {
            if (f.assignee) {
              await createNotification({
                workspaceId: workspace.id,
                userId: f.assignee.userId,
                type: 'FOLLOWUP_OVERDUE',
                title: 'Follow-up Overdue',
                body: `Follow-up for ${f.student.name} in ${f.group.name} is overdue`,
                meta: {
                  entityId: f.id,
                  entityType: 'followup',
                  studentName: f.student.name,
                  groupName: f.group.name,
                  dueAt: f.dueAt.toISOString(),
                },
              });
            }
          }
        } catch (error) {
          logger.error({ error, workspaceId: workspace.id }, 'Failed to create in-app followup notifications');
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

