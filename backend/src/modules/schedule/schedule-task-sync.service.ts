import { prisma } from '../../db/client';
import { logger } from '../../config/logger';
import { createTask } from '../tasks/task.service';
import { createAuditLog } from '../audit-logs/audit-log.service';
import { sendScheduleTaskSyncEmails } from '../emails/email.service';

interface ScheduleTaskSyncResult {
  workspaceId: string;
  templateId: string;
  tasksCreated: number;
  errors: string[];
}

/**
 * Get the current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Returns the day in the workspace's timezone context
 */
const getCurrentDayOfWeek = (): number => {
  const now = new Date();
  return now.getDay();
};

/**
 * Get today's date at 11:59 PM for task due date (as ISO string)
 * Tasks must be completed by end of day (11:59 PM Bangladesh time)
 */
const getTodayAtEndOfDayISOString = (): string => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.toISOString();
};

/**
 * Fetch the active schedule template for a workspace
 */
const getActiveTemplate = async (workspaceId: string) => {
  return prisma.weeklyScheduleTemplate.findFirst({
    where: { workspaceId, isActive: true },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  });
};

/**
 * Fetch today's slots and their assignments
 */
const getTodaysScheduleSlots = async (templateId: string, dayOfWeek: number) => {
  return prisma.scheduleSlot.findMany({
    where: {
      templateId,
      dayOfWeek,
    },
    include: {
      assignments: {
        include: {
          member: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
};

/**
 * Get the "system" member (admin) to assign tasks from
 */
const getAssignerMember = async (workspaceId: string) => {
  // Get first admin member to assign tasks from
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'ADMIN' },
  });
};

/**
 * Create a task for one schedule assignment
 * Returns true if successful, false otherwise
 */
const createTaskForAssignment = async (
  workspaceId: string,
  templateId: string,
  assignerMemberId: string,
  assigneeMemberId: string,
  slot: any,
  assignmentRoleLabel: string | null
): Promise<boolean> => {
  try {
    const taskTitle = assignmentRoleLabel
      ? `${slot.slotLabel} (${assignmentRoleLabel}) - ${slot.startTime}-${slot.endTime}`
      : `${slot.slotLabel} - ${slot.startTime}-${slot.endTime}`;

    const dueDate = getTodayAtEndOfDayISOString();

    // Create task using existing task service
    await createTask(workspaceId, assignerMemberId, {
      title: taskTitle,
      description: `Schedule assignment from template: ${templateId}`,
      assignedToId: assigneeMemberId,
      dueDate,
      priority: 'NORMAL',
      taskTypeId: null,
      referredByMemberId: null,
      referredByName: null,
    });

    return true;
  } catch (err) {
    logger.error(
      { err, workspaceId, templateId, assigneeMemberId, slot },
      'Failed to create task for schedule assignment'
    );
    return false;
  }
};

/**
 * Main sync function: convert today's schedule to tasks for all assigned members
 */
export const syncScheduleToTasks = async (workspaceId: string): Promise<ScheduleTaskSyncResult> => {
  const result: ScheduleTaskSyncResult = {
    workspaceId,
    templateId: '',
    tasksCreated: 0,
    errors: [],
  };

  try {
    // Get active template
    const template = await getActiveTemplate(workspaceId);
    if (!template) {
      result.errors.push('No active template found');
      logger.info({ workspaceId }, 'Skipping sync: no active template');
      return result;
    }

    result.templateId = template.id;

    // Get current day
    const today = getCurrentDayOfWeek();

    // Fetch slots for today
    const slots = await getTodaysScheduleSlots(template.id, today);
    if (slots.length === 0) {
      logger.info({ workspaceId, templateId: template.id, today }, 'No slots for today');
      return result;
    }

    // Get assigner member (system/admin)
    const assignerMember = await getAssignerMember(workspaceId);
    if (!assignerMember) {
      result.errors.push('No admin member found to assign tasks from');
      return result;
    }

    // Create tasks for each unique assignment
    const assignedMembers = new Set<string>();
    const tasksByMember = new Map<
      string,
      { memberName: string; email: string; tasks: any[] }
    >();

    for (const slot of slots) {
      for (const assignment of slot.assignments) {
        const memberId = assignment.memberId;
        if (assignedMembers.has(memberId)) continue; // Skip if already created task

        const success = await createTaskForAssignment(
          workspaceId,
          template.id,
          assignerMember.id,
          memberId,
          slot,
          assignment.roleLabel
        );

        if (success) {
          result.tasksCreated++;
          assignedMembers.add(memberId);

          // Track for email
          const memberName =
            assignment.member.user?.name || assignment.member.user?.email || 'Team Member';
          const email = assignment.member.user?.email;

          if (email) {
            if (!tasksByMember.has(memberId)) {
              tasksByMember.set(memberId, {
                memberName,
                email,
                tasks: [],
              });
            }

            const taskTitle = assignment.roleLabel
              ? `${slot.slotLabel} (${assignment.roleLabel}) - ${slot.startTime}-${slot.endTime}`
              : `${slot.slotLabel} - ${slot.startTime}-${slot.endTime}`;

            tasksByMember.get(memberId)!.tasks.push({
              title: taskTitle,
              description: `Schedule assignment from template: ${template.name}`,
              dueDate: getTodayAtEndOfDayISOString(),
            });
          }
        }
      }
    }

    // Send emails (fire-and-forget)
    if (tasksByMember.size > 0) {
      void sendScheduleTaskSyncEmails(
        workspaceId,
        template.name,
        process.env.FRONTEND_URL || 'https://app.brainscalecrm.com',
        Array.from(tasksByMember.values())
      ).catch((err) => {
        logger.error({ err, workspaceId }, 'Failed to send schedule sync emails (non-fatal)');
      });
    }

    // Log audit entry
    try {
      await createAuditLog({
        workspaceId,
        userId: assignerMember.userId, // Use the admin's user ID
        action: 'SCHEDULE_TASK_SYNC',
        entity: 'schedule',
        entityId: template.id,
        metadata: {
          tasksCreated: result.tasksCreated,
          slotsProcessed: slots.length,
          uniqueMembersAssigned: assignedMembers.size,
          emailsSent: tasksByMember.size,
        },
      });
    } catch (auditErr) {
      logger.error({ auditErr, workspaceId }, 'Failed to log audit entry (non-fatal)');
    }

    logger.info(
      { workspaceId, templateId: template.id, tasksCreated: result.tasksCreated },
      'Schedule-to-task sync completed'
    );

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(errorMsg);
    logger.error({ err, workspaceId }, 'Schedule-to-task sync failed');
    return result;
  }
};

/**
 * Process all workspaces that need schedule-to-task sync
 * Called by cron job hourly
 */
export const processDailyScheduleSync = async () => {
  const now = new Date();

  logger.info({ now }, 'Checking for workspaces needing schedule task sync');

  // Get all workspaces
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, timezone: true },
  });

  const results = [];

  for (const workspace of workspaces) {
    // Check if it's 8 AM in workspace timezone
    // For now, use Bangladesh time (UTC+6) as default
    // TODO: Implement timezone conversion using workspace.timezone
    const bangladeshTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const currentHour = bangladeshTime.getHours();
    const currentMinute = bangladeshTime.getMinutes();

    // Sync runs once per day between 08:00 and 08:59
    if (currentHour === 8 && currentMinute >= 0 && currentMinute < 60) {
      const result = await syncScheduleToTasks(workspace.id);
      results.push(result);
    }
  }

  logger.info({ results }, 'Daily schedule sync completed');
  return results;
};
