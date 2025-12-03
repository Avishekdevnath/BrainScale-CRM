import { prisma } from '../../db/client';
import { sendEmail } from '../../utils/email';
import {
  followupAssignmentTemplate,
  followupReminderTemplate,
  dailyDigestTemplate,
  weeklyDigestTemplate,
} from '../../utils/email-templates';
import { logger } from '../../config/logger';
import { getTomorrow, getStartOfDay, getEndOfDay, getDaysAgo } from '../../utils/date-helpers';

/**
 * Send followup assignment notification
 */
export const sendFollowupAssignmentEmail = async (followupId: string) => {
  const followup = await prisma.followup.findUnique({
    where: { id: followupId },
    include: {
      student: {
        select: {
          name: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      creator: {
        select: {
          name: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!followup || !followup.assignee) {
    return;
  }

  try {
    const html = followupAssignmentTemplate(
      followup.student.name,
      followup.group.name,
      followup.dueAt,
      followup.notes,
      followup.creator.name || undefined
    );

    await sendEmail({
      to: followup.assignee.user.email,
      subject: `New Follow-up: ${followup.student.name} - ${followup.group.name}`,
      html,
    });

    logger.info({ followupId, email: followup.assignee.user.email }, 'Followup assignment email sent');
  } catch (error) {
    logger.error({ error, followupId }, 'Failed to send followup assignment email');
    throw error;
  }
};

/**
 * Send followup reminder emails (for overdue or upcoming)
 */
export const sendFollowupReminders = async (workspaceId: string) => {
  const now = new Date();
  const tomorrow = getTomorrow();

  const followups = await prisma.followup.findMany({
    where: {
      workspaceId,
      status: 'PENDING',
      dueAt: {
        lte: tomorrow,
      },
      assignedTo: {
        not: null,
      },
    },
    include: {
      student: {
        select: {
          name: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const results = {
    sent: 0,
    failed: 0,
  };

  for (const followup of followups) {
    if (!followup.assignee) continue;

    const isOverdue = followup.dueAt < now;

    try {
      const html = followupReminderTemplate(
        followup.student.name,
        followup.group.name,
        followup.dueAt,
        isOverdue,
        followup.notes
      );

      await sendEmail({
        to: followup.assignee.user.email,
        subject: isOverdue
          ? `⚠️ Overdue Follow-up: ${followup.student.name}`
          : `Reminder: Follow-up due soon - ${followup.student.name}`,
        html,
      });

      results.sent++;
      logger.info(
        { followupId: followup.id, email: followup.assignee.user.email, isOverdue },
        'Followup reminder email sent'
      );
    } catch (error) {
      results.failed++;
      logger.error({ error, followupId: followup.id }, 'Failed to send followup reminder email');
    }
  }

  return results;
};

/**
 * Send daily digest to workspace members
 */
export const sendDailyDigest = async (workspaceId: string, userId?: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // Get workspace members to send digest to
  const where: any = { workspaceId };
  if (userId) {
    where.userId = userId;
  }

  const members = await prisma.workspaceMember.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (members.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();
  const weekStart = getDaysAgo(7);

  const [callsToday, callsThisWeek, pendingFollowups, overdueFollowups, newStudentsToday, recentCalls] =
    await Promise.all([
      prisma.call.count({
        where: { workspaceId, callDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.call.count({
        where: { workspaceId, callDate: { gte: weekStart } },
      }),
      prisma.followup.count({
        where: {
          workspaceId,
          status: 'PENDING',
          dueAt: {
            gte: new Date(),
          },
        },
      }),
      prisma.followup.count({
        where: {
          workspaceId,
          status: 'PENDING',
          dueAt: {
            lt: new Date(),
          },
        },
      }),
      prisma.student.count({
        where: { workspaceId, isDeleted: false, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.call.findMany({
        where: { workspaceId, callDate: { gte: todayStart } },
        take: 10,
        orderBy: { callDate: 'desc' },
        include: { student: { select: { name: true } } },
      }),
    ]);

  const stats = {
    callsToday,
    callsThisWeek,
    pendingFollowups,
    overdueFollowups,
    newStudents: newStudentsToday,
  };

  const recentActivity = recentCalls.map((call) => ({
    type: 'Call',
    description: `Call with ${call.student.name}`,
    date: call.callDate,
  }));

  const results = {
    sent: 0,
    failed: 0,
  };

  // Send digest to each member
  for (const member of members) {
    try {
      const html = dailyDigestTemplate(workspace.name, stats, recentActivity);

      await sendEmail({
        to: member.user.email,
        subject: `Daily Summary - ${workspace.name}`,
        html,
      });

      results.sent++;
      logger.info({ workspaceId, userId: member.userId, email: member.user.email }, 'Daily digest sent');
    } catch (error) {
      results.failed++;
      logger.error({ error, workspaceId, userId: member.userId }, 'Failed to send daily digest');
    }
  }

  return results;
};

/**
 * Send weekly digest to workspace members
 */
export const sendWeeklyDigest = async (workspaceId: string, userId?: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // Get workspace members to send digest to
  const where: any = { workspaceId };
  if (userId) {
    where.userId = userId;
  }

  const members = await prisma.workspaceMember.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (members.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Calculate week range (last 7 days)
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalCalls,
    totalFollowups,
    completedFollowups,
    newStudents,
    groupsWithStudents,
  ] = await Promise.all([
    prisma.call.count({
      where: {
        workspaceId,
        callDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),
    prisma.followup.count({
      where: {
        workspaceId,
        createdAt: {
          gte: weekStart,
        },
      },
    }),
    prisma.followup.count({
      where: {
        workspaceId,
        status: 'DONE',
        updatedAt: {
          gte: weekStart,
        },
      },
    }),
    prisma.student.count({
      where: {
        workspaceId,
        createdAt: {
          gte: weekStart,
        },
        isDeleted: false,
      },
    }),
    prisma.group.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            statuses: true,
          },
        },
      },
      orderBy: {
        statuses: {
          _count: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const stats = {
    totalCalls,
    totalFollowups,
    completedFollowups,
    newStudents,
    topGroups: groupsWithStudents.map((group) => ({
      name: group.name,
      studentCount: group._count.statuses,
    })),
  };

  const results = {
    sent: 0,
    failed: 0,
  };

  // Send digest to each member
  for (const member of members) {
    try {
      const html = weeklyDigestTemplate(workspace.name, stats, weekStart, weekEnd);

      await sendEmail({
        to: member.user.email,
        subject: `Weekly Summary - ${workspace.name}`,
        html,
      });

      results.sent++;
      logger.info({ workspaceId, userId: member.userId, email: member.user.email }, 'Weekly digest sent');
    } catch (error) {
      results.failed++;
      logger.error({ error, workspaceId, userId: member.userId }, 'Failed to send weekly digest');
    }
  }

  return results;
};

