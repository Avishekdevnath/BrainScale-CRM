import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../config/logger';
import type { ListNotificationsInput, UpdatePreferencesInput } from './notification.schemas';

// ─── Internal helpers ───────────────────────────────────────────────────────

/** Returns true if the user's preferences allow this notification type. */
async function shouldNotify(workspaceId: string, userId: string, type: string): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!prefs) return true; // Default: all enabled

  switch (type) {
    case 'FOLLOWUP_ASSIGNED':  return prefs.followupAssigned;
    case 'FOLLOWUP_DUE_SOON':  return prefs.followupDueSoon;
    case 'FOLLOWUP_OVERDUE':   return prefs.followupOverdue;
    case 'CALL_LOG_COMPLETED': return prefs.callLogCompleted;
    default:                   return true;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create an in-app notification for a user.
 * Called by other services (followup, cron). Respects user preferences.
 */
export async function createNotification(data: {
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const allowed = await shouldNotify(data.workspaceId, data.userId, data.type);
    if (!allowed) return;

    await prisma.notification.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        meta: data.meta ?? null,
      },
    });
  } catch (error) {
    logger.error({ error, data }, 'Failed to create notification');
  }
}

/** List notifications for the current user (paginated). */
export async function listNotifications(
  workspaceId: string,
  userId: string,
  input: ListNotificationsInput
) {
  const page = input.page ?? 1;
  const size = Math.min(input.size ?? 20, 100);
  const skip = (page - 1) * size;

  const where: { workspaceId: string; userId: string; isRead?: boolean } = {
    workspaceId,
    userId,
  };
  if (input.unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { workspaceId, userId, isRead: false } }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
    unreadCount,
  };
}

/** Get only the unread count — used for badge polling. */
export async function getUnreadCount(workspaceId: string, userId: string): Promise<number> {
  return prisma.notification.count({
    where: { workspaceId, userId, isRead: false },
  });
}

/** Mark a single notification as read (verifies ownership). */
export async function markAsRead(id: string, workspaceId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id, workspaceId, userId },
  });
  if (!notification) throw new AppError(404, 'Notification not found');

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

/** Mark all notifications as read for a user. */
export async function markAllAsRead(workspaceId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { workspaceId, userId, isRead: false },
    data: { isRead: true },
  });
}

/** Delete a single notification (verifies ownership). */
export async function deleteNotification(
  id: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id, workspaceId, userId },
  });
  if (!notification) throw new AppError(404, 'Notification not found');

  await prisma.notification.delete({ where: { id } });
}

/** Get notification preferences (creates defaults if not yet set). */
export async function getPreferences(workspaceId: string, userId: string) {
  return prisma.notificationPreference.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { workspaceId, userId },
    update: {},
  });
}

/** Update notification preferences (upsert). */
export async function updatePreferences(
  workspaceId: string,
  userId: string,
  input: UpdatePreferencesInput
) {
  return prisma.notificationPreference.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: {
      workspaceId,
      userId,
      followupAssigned: input.followupAssigned ?? true,
      followupDueSoon: input.followupDueSoon ?? true,
      followupOverdue: input.followupOverdue ?? true,
      callLogCompleted: input.callLogCompleted ?? false,
    },
    update: {
      ...(input.followupAssigned !== undefined && { followupAssigned: input.followupAssigned }),
      ...(input.followupDueSoon !== undefined && { followupDueSoon: input.followupDueSoon }),
      ...(input.followupOverdue !== undefined && { followupOverdue: input.followupOverdue }),
      ...(input.callLogCompleted !== undefined && { callLogCompleted: input.callLogCompleted }),
    },
  });
}
