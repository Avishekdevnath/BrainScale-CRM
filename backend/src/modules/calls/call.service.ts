import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateCallInput, UpdateCallInput, ListCallsInput } from './call.schemas';

/**
 * Create a new call
 */
const verifyStudentAccess = async (studentId: string, workspaceId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, workspaceId, isDeleted: false },
  });
  if (!student) throw new AppError(404, 'Student not found');
  return student;
};

const verifyGroupAccess = async (groupId: string, workspaceId: string, userId: string) => {
  const group = await prisma.group.findFirst({
    where: { id: groupId, workspaceId, isActive: true },
  });
  if (!group) throw new AppError(404, 'Group not found');

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    include: { groupAccess: { where: { groupId } } },
  });

  if (!membership) throw new AppError(403, 'Access denied');
  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
  }

  return group;
};

export const createCall = async (
  workspaceId: string,
  userId: string,
  data: CreateCallInput
) => {
  await verifyStudentAccess(data.studentId, workspaceId);
  await verifyGroupAccess(data.groupId, workspaceId, userId);

  // Create call
  const call = await prisma.call.create({
    data: {
      workspaceId,
      studentId: data.studentId,
      groupId: data.groupId,
      createdBy: userId,
      callStatus: data.callStatus,
      callDate: data.callDate ? new Date(data.callDate) : new Date(),
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
    },
  });

  return call;
};

/**
 * List calls for a student
 */
export const listStudentCalls = async (workspaceId: string, studentId: string) => {
  // Verify student belongs to workspace
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      workspaceId,
      isDeleted: false,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  const calls = await prisma.call.findMany({
    where: {
      workspaceId,
      studentId,
    },
    include: {
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
    },
    orderBy: {
      callDate: 'desc',
    },
  });

  return calls;
};

/**
 * List calls for a group with pagination and date filtering
 */
export const listGroupCalls = async (
  workspaceId: string,
  groupId: string,
  userId: string,
  options: ListCallsInput
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

  if (options.startDate || options.endDate) {
    where.callDate = {};
    if (options.startDate) {
      where.callDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.callDate.lte = new Date(options.endDate);
    }
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100); // Max 100 per page
  const skip = (page - 1) * size;

  // Get calls with pagination
  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        callDate: 'desc',
      },
      skip,
      take: size,
    }),
    prisma.call.count({ where }),
  ]);

  return {
    calls,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get call by ID
 */
export const getCall = async (callId: string, workspaceId: string) => {
  const call = await prisma.call.findFirst({
    where: {
      id: callId,
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
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!call) {
    throw new AppError(404, 'Call not found');
  }

  return call;
};

/**
 * Update a call
 */
export const updateCall = async (
  callId: string,
  workspaceId: string,
  userId: string,
  data: UpdateCallInput
) => {
  const call = await prisma.call.findFirst({
    where: {
      id: callId,
      workspaceId,
    },
  });

  if (!call) {
    throw new AppError(404, 'Call not found');
  }

  // Only creator can update (or admin)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (call.createdBy !== userId && membership?.role !== 'ADMIN') {
    throw new AppError(403, 'Only the call creator or admin can update this call');
  }

  const updatedCall = await prisma.call.update({
    where: { id: callId },
    data: {
      callStatus: data.callStatus,
      callDate: data.callDate ? new Date(data.callDate) : undefined,
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
    },
  });

  return updatedCall;
};

/**
 * Delete a call
 */
export const deleteCall = async (callId: string, workspaceId: string, userId: string) => {
  const call = await prisma.call.findFirst({
    where: {
      id: callId,
      workspaceId,
    },
  });

  if (!call) {
    throw new AppError(404, 'Call not found');
  }

  // Only creator can delete (or admin)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (call.createdBy !== userId && membership?.role !== 'ADMIN') {
    throw new AppError(403, 'Only the call creator or admin can delete this call');
  }

  await prisma.call.delete({
    where: { id: callId },
  });

  return { message: 'Call deleted successfully' };
};

