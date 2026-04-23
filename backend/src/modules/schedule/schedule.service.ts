import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { sendEmail } from '../../utils/email';
import * as auditLogService from '../audit-logs/audit-log.service';
import {
  ListExceptionsQuerySchema,
  SaveTemplateSchema,
  ScheduleExceptionSchema,
  type SaveTemplateInput,
  type ScheduleChange,
} from './schedule.schemas';

// Helper: Notify members assigned to schedule
const notifyMembersOfScheduleUpdate = async (
  workspaceId: string,
  updatedByUserId: string,
  templateId: string
) => {
  try {
    // Get all members assigned to this schedule
    const assignedMembers = await prisma.scheduleAssignment.findMany({
      where: {
        slot: {
          template: {
            id: templateId,
            workspaceId,
          },
        },
      },
      distinct: ['memberId'],
      select: {
        memberId: true,
      },
    });

    const uniqueMemberIds = [...new Set(assignedMembers.map((a) => a.memberId))];

    if (uniqueMemberIds.length === 0) return;

    // Get member details and updated by user info
    const [members, updatedByUser, workspace, template] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { id: { in: uniqueMemberIds }, workspaceId },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.findUnique({
        where: { id: updatedByUserId },
        select: { name: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      prisma.weeklyScheduleTemplate.findUnique({
        where: { id: templateId },
        select: { name: true },
      }),
    ]);

    const updaterName = updatedByUser?.name || 'Team';
    const workspaceName = workspace?.name || 'BrainScale CRM';
    const templateName = template?.name || 'Weekly Schedule';

    // Send in-app notifications (fire and forget)
    for (const member of members) {
      prisma.notification
        .create({
          data: {
            workspaceId,
            userId: member.userId,
            title: 'Schedule Updated',
            body: `${updaterName} updated the ${templateName}. Check your new assignments.`,
            type: 'SCHEDULE_UPDATED',
            meta: {
              entityId: templateId,
              entityType: 'SCHEDULE',
            },
          },
        })
        .catch((err) => console.error('Failed to create notification:', err));
    }

    // Send emails (fire and forget)
    const emailHtml = `
      <h2>Schedule Updated</h2>
      <p>Hi there,</p>
      <p><strong>${updaterName}</strong> has updated the <strong>${templateName}</strong> for ${workspaceName}.</p>
      <p>Please log in to your workspace to view your updated assignments.</p>
      <p style="color: #666; font-size: 12px;">
        To view the schedule, log in to your workspace and navigate to Schedules → Weekly Duty Template.
      </p>
      <p>Best regards,<br/>${workspaceName} Team</p>
    `;

    for (const member of members) {
      if (member.user.email) {
        sendEmail({
          to: member.user.email,
          subject: `${templateName} Updated - ${workspaceName}`,
          html: emailHtml,
        }).catch((err) => console.error(`Failed to send email to ${member.user.email}:`, err));
      }
    }
  } catch (err) {
    console.error('Failed to notify members of schedule update:', err);
    // Don't throw - notifications should not block the main operation
  }
};

type SlotKeyInput = {
  dayOfWeek: number;
  batchId?: string | null;
  slotLabel: string;
  order: number;
};

const buildSlotKey = (input: SlotKeyInput) =>
  `${input.dayOfWeek}|${input.batchId ?? ''}|${input.slotLabel}|${input.order}`;

const requireWorkspaceMember = async (workspaceId: string, userId: string) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { id: true },
  });
  if (!member) throw new AppError(403, 'Access denied');
  return member;
};

const ensureTemplate = async (workspaceId: string) => {
  const existing = await prisma.weeklyScheduleTemplate.findFirst({
    where: { workspaceId, isActive: true },
  });

  if (existing) return existing;

  return prisma.weeklyScheduleTemplate.create({
    data: {
      workspaceId,
      name: 'Default Schedule',
      isActive: true,
    },
  });
};

export const getActiveTemplate = async (workspaceId: string, userId: string) => {
  await requireWorkspaceMember(workspaceId, userId);

  const template = await ensureTemplate(workspaceId);

  const [slots, assignments, batches] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { templateId: template.id },
      orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
    }),
    prisma.scheduleAssignment.findMany({
      where: { slot: { templateId: template.id } },
    }),
    prisma.batch.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return { template, slots, assignments, batches };
};

const validateAssignments = (
  input: SaveTemplateInput,
  slotIdByKey: Map<string, string>,
  validMemberIds: Set<string>
) => {
  const assignmentUniq = new Set<string>();
  for (const assignment of input.assignments) {
    if (!validMemberIds.has(assignment.memberId)) {
      throw new AppError(400, `Invalid memberId in assignment: ${assignment.memberId}`);
    }

    const slotKey = buildSlotKey(assignment);
    if (!slotIdByKey.has(slotKey)) {
      throw new AppError(400, `Assignment refers to unknown slot key: ${slotKey}`);
    }

    const assignmentKey = `${slotKey}|${assignment.memberId}`;
    if (assignmentUniq.has(assignmentKey)) {
      throw new AppError(400, `Duplicate assignment in payload: ${assignmentKey}`);
    }
    assignmentUniq.add(assignmentKey);
  }
};

export const saveTemplate = async (workspaceId: string, userId: string, payload: unknown) => {
  await requireWorkspaceMember(workspaceId, userId);
  const input = SaveTemplateSchema.parse(payload);

  const template = await ensureTemplate(workspaceId);

  const [activeBatches, workspaceMembers] = await Promise.all([
    prisma.batch.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { id: true },
    }),
  ]);

  const activeBatchIds = new Set(activeBatches.map((batch) => batch.id));
  const validMemberIds = new Set(workspaceMembers.map((member) => member.id));

  for (const slot of input.slots) {
    if (slot.batchId && !activeBatchIds.has(slot.batchId)) {
      throw new AppError(400, `Inactive or unknown batch in slot: ${slot.batchId}`);
    }
  }

  const slotIdByKey = new Map<string, string>();
  for (const slot of input.slots) {
    const slotKey = buildSlotKey(slot);
    if (slotIdByKey.has(slotKey)) {
      throw new AppError(400, `Duplicate slot key in payload: ${slotKey}`);
    }
    slotIdByKey.set(slotKey, '');
  }
  validateAssignments(input, slotIdByKey, validMemberIds);

  await prisma.$transaction(async (tx) => {
    await tx.scheduleAssignment.deleteMany({
      where: { slot: { templateId: template.id } },
    });
    await tx.scheduleSlot.deleteMany({
      where: { templateId: template.id },
    });

    if (input.slots.length > 0) {
      await tx.scheduleSlot.createMany({
        data: input.slots.map((slot) => ({
          templateId: template.id,
          dayOfWeek: slot.dayOfWeek,
          batchId: slot.batchId ?? null,
          slotGroup: slot.slotGroup,
          slotLabel: slot.slotLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          order: slot.order,
        })),
      });
    }

    const savedSlots = await tx.scheduleSlot.findMany({
      where: { templateId: template.id },
      select: {
        id: true,
        dayOfWeek: true,
        batchId: true,
        slotLabel: true,
        order: true,
      },
    });

    const savedSlotIdByKey = new Map(
      savedSlots.map((slot) => [buildSlotKey(slot), slot.id])
    );

    const assignmentRows = input.assignments.map((assignment) => {
      const slotId = savedSlotIdByKey.get(buildSlotKey(assignment));
      if (!slotId) {
        throw new AppError(400, 'Unable to map assignment to a saved slot');
      }
      return {
        slotId,
        memberId: assignment.memberId,
        roleLabel: assignment.roleLabel ?? null,
      };
    });

    if (assignmentRows.length > 0) {
      await tx.scheduleAssignment.createMany({ data: assignmentRows });
    }
  });

  // Notify members of schedule update (fire and forget)
  void notifyMembersOfScheduleUpdate(workspaceId, userId, template.id);

  // Log to audit trail (fire and forget)
  void auditLogService.createAuditLog({
    workspaceId,
    userId,
    action: 'SCHEDULE_SAVED',
    entity: 'schedule_template',
    entityId: template.id,
    metadata: {
      templateName: template.name,
      slotCount: input.slots.length,
      assignmentCount: input.assignments.length,
    },
  });

  return getActiveTemplate(workspaceId, userId);
};

export const listExceptionsForDate = async (workspaceId: string, userId: string, date: string) => {
  await requireWorkspaceMember(workspaceId, userId);
  const { date: parsedDate } = ListExceptionsQuerySchema.parse({ date });

  const dayStart = new Date(`${parsedDate}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return prisma.scheduleException.findMany({
    where: {
      workspaceId,
      date: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createException = async (workspaceId: string, userId: string, payload: unknown) => {
  await requireWorkspaceMember(workspaceId, userId);
  const input = ScheduleExceptionSchema.parse(payload);

  if (input.memberId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { id: input.memberId, workspaceId },
      select: { id: true },
    });
    if (!member) throw new AppError(400, 'memberId is not in this workspace');
  }

  if (input.overrideMemberId) {
    const overrideMember = await prisma.workspaceMember.findFirst({
      where: { id: input.overrideMemberId, workspaceId },
      select: { id: true },
    });
    if (!overrideMember) throw new AppError(400, 'overrideMemberId is not in this workspace');
  }

  if (input.slotId) {
    const slot = await prisma.scheduleSlot.findFirst({
      where: {
        id: input.slotId,
        template: { workspaceId, isActive: true },
      },
      select: { id: true },
    });
    if (!slot) throw new AppError(400, 'slotId is not valid for this workspace');
  }

  return prisma.scheduleException.create({
    data: {
      workspaceId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      memberId: input.memberId ?? null,
      type: input.type,
      slotId: input.slotId ?? null,
      overrideMemberId: input.overrideMemberId ?? null,
      note: input.note ?? null,
    },
  });
};

export const deleteException = async (workspaceId: string, userId: string, id: string) => {
  await requireWorkspaceMember(workspaceId, userId);

  const existing = await prisma.scheduleException.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Exception not found');

  await prisma.scheduleException.delete({ where: { id } });
  return { message: 'Exception deleted' };
};

export const broadcastSchedule = async (
  workspaceId: string,
  userId: string,
  recipientEmails: string[],
  formats: string[],
  scheduleName: string
) => {
  await requireWorkspaceMember(workspaceId, userId);

  if (recipientEmails.length === 0) {
    throw new AppError(400, 'No recipient emails provided');
  }

  if (formats.length === 0) {
    throw new AppError(400, 'At least one format must be selected');
  }

  // Get workspace info for email
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Get sender info
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Prepare email content
  const subject = `${scheduleName} - Weekly Duty Schedule`;
  const downloadLinks = formats
    .map((format) => {
      const formatLabel = format.charAt(0).toUpperCase() + format.slice(1);
      return `• <strong>${formatLabel}</strong>: Download from your workspace`;
    })
    .join('<br/>');

  const htmlBody = `
    <h2>${scheduleName}</h2>
    <p>Hi there,</p>
    <p>${sender?.name || 'Your team'} has shared the weekly duty schedule with you.</p>
    <h3>Available Formats:</h3>
    <p>${downloadLinks}</p>
    <p style="color: #666; font-size: 12px;">
      To download, log in to your workspace and navigate to Schedules → Weekly Duty Template.
    </p>
    <p>Best regards,<br/>${workspace.name} Team</p>
  `;

  // Send emails to all recipients
  const sendPromises = recipientEmails.map((email) =>
    sendEmail({
      to: email,
      subject,
      html: htmlBody,
    }).catch((err: any) => {
      console.error(`Failed to send schedule to ${email}:`, err);
      // Don't throw - continue sending to other recipients
    })
  );

  await Promise.all(sendPromises);

  return {
    message: 'Schedule broadcast sent',
    recipientCount: recipientEmails.length,
    formats,
  };
};

export const processBulkUpdate = async (
  workspaceId: string,
  userId: string,
  templateId: string,
  changes: ScheduleChange[]
) => {
  await requireWorkspaceMember(workspaceId, userId);

  const template = await prisma.weeklyScheduleTemplate.findFirst({
    where: { id: templateId, workspaceId },
    select: { id: true },
  });
  if (!template) throw new AppError(404, 'Template not found');

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      switch (change.action) {
        case 'update_slot':
          await tx.scheduleSlot.update({
            where: { id: change.slotId },
            data: {
              ...(change.data.startTime && { startTime: change.data.startTime }),
              ...(change.data.endTime && { endTime: change.data.endTime }),
              ...(change.data.slotLabel && { slotLabel: change.data.slotLabel }),
            },
          });
          break;

        case 'update_assignment':
          // Update existing assignment
          if (change.data.memberId === null) {
            // Unassign: delete the assignment
            await tx.scheduleAssignment.delete({
              where: { id: change.assignmentId },
            });
          } else {
            // Reassign: update memberId
            await tx.scheduleAssignment.update({
              where: { id: change.assignmentId },
              data: { memberId: change.data.memberId },
            });
          }
          break;

        case 'create_slot':
          await tx.scheduleSlot.create({
            data: {
              templateId,
              dayOfWeek: change.dayOfWeek,
              batchId: change.batchId,
              slotGroup: 'default',
              slotLabel: change.data.slotLabel,
              startTime: change.data.startTime,
              endTime: change.data.endTime,
              order: change.data.order,
            },
          });
          break;

        case 'delete_slot':
          // Delete assignments first (foreign key constraint)
          await tx.scheduleAssignment.deleteMany({
            where: { slotId: change.slotId },
          });
          await tx.scheduleSlot.delete({
            where: { id: change.slotId },
          });
          break;

        case 'reorder_batch':
          // Reorder slots within batch/day by incrementing order values
          const batchSlots = await tx.scheduleSlot.findMany({
            where: {
              batchId: change.batchId,
              dayOfWeek: change.dayOfWeek,
            },
            orderBy: { order: 'asc' },
          });

          // Update each slot's order based on position
          for (let i = 0; i < batchSlots.length; i++) {
            await tx.scheduleSlot.update({
              where: { id: batchSlots[i].id },
              data: { order: change.newOrder + i },
            });
          }
          break;
      }
    }

    // Return updated template with all relations
    return tx.weeklyScheduleTemplate.findUnique({
      where: { id: templateId },
      include: {
        slots: {
          include: { assignments: true },
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
    });
  });

  // Notify members of schedule update (fire and forget)
  void notifyMembersOfScheduleUpdate(workspaceId, userId, templateId);

  // Log to audit trail (fire and forget)
  void auditLogService.createAuditLog({
    workspaceId,
    userId,
    action: 'SCHEDULE_UPDATED',
    entity: 'schedule_template',
    entityId: templateId,
    metadata: {
      changeCount: changes.length,
      changeActions: changes.map((c) => c.action),
    },
  });

  return result;
};
