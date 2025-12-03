import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../config/logger';
import { sendFollowupAssignmentEmail } from '../emails/email.service';
import { CreateFollowupInput, UpdateFollowupInput, ListFollowupsInput } from './followup.schemas';

/**
 * Create a new follow-up (with immediate email notification)
 */
const verifyStudent = async (studentId: string, workspaceId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, workspaceId, isDeleted: false },
    include: { phones: { where: { isPrimary: true }, take: 1 } },
  });
  if (!student) throw new AppError(404, 'Student not found');
  return student;
};

const verifyGroup = async (groupId: string, workspaceId: string) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, workspaceId, isActive: true },
  });
  if (!group) throw new AppError(404, 'Group not found');
  return group;
};

const verifyGroupAccess = async (groupId: string, workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    include: { groupAccess: { where: { groupId } } },
  });

  if (!membership || (membership.role !== 'ADMIN' && membership.groupAccess.length === 0)) {
    throw new AppError(403, 'Access denied');
  }
  return membership;
};

export const createFollowup = async (
  workspaceId: string,
  userId: string,
  data: CreateFollowupInput
) => {
  const student = await verifyStudent(data.studentId, workspaceId);
  await verifyGroup(data.groupId, workspaceId);
  await verifyGroupAccess(data.groupId, workspaceId, userId);

  // Validate callListId if provided
  if (data.callListId) {
    const callList = await prisma.callList.findFirst({
      where: { id: data.callListId, workspaceId },
    });
    if (!callList) {
      throw new AppError(404, 'Call list not found');
    }
  }

  // Validate previousCallLogId if provided
  if (data.previousCallLogId) {
    const previousCallLog = await prisma.callLog.findFirst({
      where: {
        id: data.previousCallLogId,
        callList: {
          workspaceId,
        },
      },
    });
    if (!previousCallLog) {
      throw new AppError(404, 'Previous call log not found');
    }
  }

  if (data.assignedTo) {
    const assignee = await prisma.workspaceMember.findFirst({
      where: { id: data.assignedTo, workspaceId },
    });
    if (!assignee) throw new AppError(404, 'Assigned member not found');
  }

  const followup = await prisma.followup.create({
    data: {
      workspaceId,
      studentId: data.studentId,
      groupId: data.groupId,
      callListId: data.callListId,
      previousCallLogId: data.previousCallLogId,
      createdBy: userId,
      assignedTo: data.assignedTo,
      dueAt: new Date(data.dueAt),
      status: 'PENDING',
      notes: data.notes,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: { select: { phone: true, isPrimary: true } },
        },
      },
      group: { select: { id: true, name: true } },
      callList: { select: { id: true, name: true } },
      previousCallLog: {
        select: {
          id: true,
          callDate: true,
          status: true,
        },
      },
      creator: { select: { id: true, name: true, email: true } },
      assignee: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (data.assignedTo && followup.assignee) {
    try {
      await sendFollowupAssignmentEmail(followup.id);
    } catch (error) {
      // Log error but don't fail follow-up creation
      logger.error({ error }, 'Failed to send follow-up email');
    }
  }

  return followup;
};

/**
 * List follow-ups for a group
 */
export const listGroupFollowups = async (
  workspaceId: string,
  groupId: string,
  userId: string,
  options: ListFollowupsInput
) => {
  // Verify group belongs to workspace
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      workspaceId,
      isActive: true,
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  // Verify user has access to this group
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: {
        where: { groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
  }

  // Build where clause
  const where: any = {
    workspaceId,
    groupId,
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.assignedTo) {
    where.assignedTo = options.assignedTo;
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  if (options.startDate || options.endDate) {
    where.dueAt = {};
    if (options.startDate) {
      where.dueAt.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.dueAt.lte = new Date(options.endDate);
    }
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get follow-ups with pagination
  const [followups, total] = await Promise.all([
    prisma.followup.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        group: { select: { id: true, name: true } },
        callList: { select: { id: true, name: true } },
        previousCallLog: {
          select: {
            id: true,
            callDate: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueAt: 'asc', // Show earliest due first
      },
      skip,
      take: size,
    }),
    prisma.followup.count({ where }),
  ]);

  // Mark overdue follow-ups
  const now = new Date();
  const followupsWithOverdue = followups.map((f) => ({
    ...f,
    isOverdue: f.status === 'PENDING' && f.dueAt < now,
  }));

  return {
    followups: followupsWithOverdue,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * List follow-ups at workspace level (not group-specific)
 * Supports filtering by callListId, status, assignedTo, groupId, date range
 */
export const listFollowups = async (
  workspaceId: string,
  userId: string,
  options: ListFollowupsInput
) => {
  // Verify user is a member of the workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: true,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Build where clause
  const where: any = {
    workspaceId,
  };

  if (options.status) {
    where.status = options.status;
  }

  if (options.assignedTo) {
    where.assignedTo = options.assignedTo;
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  if (options.groupId) {
    // Verify user has access to this group if not admin
    if (membership.role !== 'ADMIN') {
      const hasAccess = membership.groupAccess.some((ga) => ga.groupId === options.groupId);
      if (!hasAccess) {
        throw new AppError(403, 'Access denied to this group');
      }
    }
    where.groupId = options.groupId;
  } else {
    // If no groupId specified and user is not admin, filter by accessible groups only
    if (membership.role !== 'ADMIN') {
      const accessibleGroupIds = membership.groupAccess.map((ga) => ga.groupId);
      if (accessibleGroupIds.length > 0) {
        where.groupId = { in: accessibleGroupIds };
      } else {
        // User has no group access, return empty result
        return {
          followups: [],
          pagination: {
            page: options.page || 1,
            size: Math.min(options.size || 20, 100),
            total: 0,
            totalPages: 0,
          },
        };
      }
    }
  }

  if (options.startDate || options.endDate) {
    where.dueAt = {};
    if (options.startDate) {
      where.dueAt.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.dueAt.lte = new Date(options.endDate);
    }
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get follow-ups with pagination
  const [followups, total] = await Promise.all([
    prisma.followup.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        group: { select: { id: true, name: true } },
        callList: { select: { id: true, name: true } },
        previousCallLog: {
          select: {
            id: true,
            callDate: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueAt: 'asc', // Show earliest due first
      },
      skip,
      take: size,
    }),
    prisma.followup.count({ where }),
  ]);

  // Mark overdue follow-ups
  const now = new Date();
  const followupsWithOverdue = followups.map((f) => ({
    ...f,
    isOverdue: f.status === 'PENDING' && f.dueAt < now,
  }));

  return {
    followups: followupsWithOverdue,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get follow-up by ID
 */
export const getFollowup = async (followupId: string, workspaceId: string) => {
  const followup = await prisma.followup.findFirst({
    where: {
      id: followupId,
      workspaceId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      callList: {
        select: {
          id: true,
          name: true,
        },
      },
      previousCallLog: {
        select: {
          id: true,
          callDate: true,
          status: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!followup) {
    throw new AppError(404, 'Follow-up not found');
  }

  const now = new Date();
  return {
    ...followup,
    isOverdue: followup.status === 'PENDING' && followup.dueAt < now,
  };
};

/**
 * Update a follow-up
 */
export const updateFollowup = async (
  followupId: string,
  workspaceId: string,
  userId: string,
  data: UpdateFollowupInput
) => {
  const followup = await prisma.followup.findFirst({
    where: {
      id: followupId,
      workspaceId,
    },
  });

  if (!followup) {
    throw new AppError(404, 'Follow-up not found');
  }

  // Verify user has permission (creator, assignee, or admin)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  const canUpdate =
    followup.createdBy === userId ||
    followup.assignedTo === userId ||
    membership?.role === 'ADMIN';

  if (!canUpdate) {
    throw new AppError(403, 'You do not have permission to update this follow-up');
  }

  // Verify assignedTo member if being updated
  if (data.assignedTo && data.assignedTo !== followup.assignedTo) {
    const assignee = await prisma.workspaceMember.findFirst({
      where: {
        id: data.assignedTo,
        workspaceId,
      },
    });

    if (!assignee) {
      throw new AppError(404, 'Assigned member not found');
    }
  }

  const updatedFollowup = await prisma.followup.update({
    where: { id: followupId },
    data: {
      assignedTo: data.assignedTo,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      status: data.status,
      notes: data.notes,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();
  return {
    ...updatedFollowup,
    isOverdue: updatedFollowup.status === 'PENDING' && updatedFollowup.dueAt < now,
  };
};

/**
 * Delete a follow-up
 */
export const deleteFollowup = async (
  followupId: string,
  workspaceId: string,
  userId: string
) => {
  const followup = await prisma.followup.findFirst({
    where: {
      id: followupId,
      workspaceId,
    },
  });

  if (!followup) {
    throw new AppError(404, 'Follow-up not found');
  }

  // Only creator or admin can delete
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (followup.createdBy !== userId && membership?.role !== 'ADMIN') {
    throw new AppError(403, 'Only the creator or admin can delete this follow-up');
  }

  await prisma.followup.delete({
    where: { id: followupId },
  });

  return { message: 'Follow-up deleted successfully' };
};

/**
 * Get follow-up call context for making a follow-up call
 * Returns follow-up details with call list questions and previous call log
 */
export const getFollowupCallContext = async (
  followupId: string,
  workspaceId: string,
  userId: string
) => {
  // Get follow-up with full relations
  const followup = await prisma.followup.findFirst({
    where: {
      id: followupId,
      workspaceId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          phones: {
            select: {
              phone: true,
              isPrimary: true,
            },
          },
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      callList: {
        select: {
          id: true,
          name: true,
          meta: true,
        },
      },
      previousCallLog: {
        select: {
          id: true,
          callDate: true,
          callDuration: true,
          status: true,
          answers: true,
          notes: true,
          callerNote: true,
        },
        include: {
          assignee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!followup) {
    throw new AppError(404, 'Follow-up not found');
  }

  // Verify user has access to the follow-up's group
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: {
        where: { groupId: followup.groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this follow-up');
  }

  // Extract questions from call list meta
  const questions = followup.callList?.meta
    ? (followup.callList.meta as any)?.questions || []
    : [];

  // Extract previous answers from previous call log
  const previousAnswers = followup.previousCallLog?.answers
    ? (followup.previousCallLog.answers as any[])
    : [];

  // Return structured context
  return {
    followup: {
      id: followup.id,
      student: followup.student,
      group: followup.group,
      dueAt: followup.dueAt,
      notes: followup.notes,
      status: followup.status,
      assignedTo: followup.assignee
        ? {
            id: followup.assignee.id,
            name: followup.assignee.user.name,
            email: followup.assignee.user.email,
          }
        : null,
    },
    callList: followup.callList
      ? {
          id: followup.callList.id,
          name: followup.callList.name,
          questions: questions,
        }
      : null,
    previousCallLog: followup.previousCallLog
      ? {
          id: followup.previousCallLog.id,
          callDate: followup.previousCallLog.callDate,
          status: followup.previousCallLog.status,
          answers: previousAnswers,
          notes: followup.previousCallLog.notes,
          callerNote: followup.previousCallLog.callerNote,
          callDuration: followup.previousCallLog.callDuration,
          caller: followup.previousCallLog.assignee
            ? {
                id: followup.previousCallLog.assignee.id,
                name: followup.previousCallLog.assignee.user.name,
                email: followup.previousCallLog.assignee.user.email,
              }
            : null,
        }
      : null,
  };
};

