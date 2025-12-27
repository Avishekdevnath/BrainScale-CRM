import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { getStartOfWeek } from '../../utils/date-helpers';
import { GetMyCallsInput } from './call-list.schemas';

/**
 * Get my calls (call list items assigned to current user)
 */
export const getMyCalls = async (
  workspaceId: string,
  userId: string,
  options: GetMyCallsInput
) => {
  // Get current user's WorkspaceMember ID
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!member) {
    throw new AppError(403, 'Access denied');
  }

  // Build where clause: assignedTo = user's member ID
  const where: any = {
    assignedTo: member.id,
    callList: {
      workspaceId,
    },
  };

  // Apply filters
  if (options.state) {
    where.state = options.state;
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  // Filter by follow-ups required
  if (options.followUpRequired !== undefined) {
    // Only show items that have a callLog (completed calls) with follow-up required
    where.callLogId = { not: null }; // Ensure callLog exists
    where.callLog = {
      followUpRequired: options.followUpRequired,
      assignedTo: member.id, // Only show follow-ups for calls made by the logged-in user
    };
  }

  // Filter by groupId via callList.groupId
  if (options.groupId) {
    where.callList = {
      ...where.callList,
      groupId: options.groupId,
    };
  }

  // Filter by batchId via callList.group.batchId
  if (options.batchId) {
    if (where.callList.groupId) {
      where.callList = {
        ...where.callList,
        group: {
          batchId: options.batchId,
        },
      };
    } else {
      where.callList = {
        ...where.callList,
        group: {
          batchId: options.batchId,
        },
      };
    }
  }

  // Pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get items with relations
  const [items, total] = await Promise.all([
    prisma.callListItem.findMany({
      where,
      include: {
        callList: {
          include: {
            group: {
              include: {
                batch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
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
        callLog: {
          select: {
            id: true,
            status: true,
            callDate: true,
            callDuration: true,
            assignedTo: true,
            followUpRequired: true,
            answers: true,
            notes: true,
            callerNote: true,
            followUpDate: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      skip,
      take: size,
    }),
    prisma.callListItem.count({ where }),
  ]);

  // Extract questions from call list meta
  const itemsWithQuestions = items.map((item) => {
    const questions = (item.callList.meta as any)?.questions || [];
    const messages = item.callList.messages || [];
    return {
      ...item,
      callList: {
        ...item.callList,
        questions,
        messages,
      },
    };
  });

  return {
    items: itemsWithQuestions,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get my calls statistics
 */
export const getMyCallsStats = async (workspaceId: string, userId: string) => {
  // Get current user's WorkspaceMember ID
  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!member) {
    throw new AppError(403, 'Access denied');
  }

  // Count total assigned
  const totalAssigned = await prisma.callListItem.count({
    where: {
      assignedTo: member.id,
      callList: {
        workspaceId,
      },
    },
  });

  // Count completed (DONE)
  const completed = await prisma.callListItem.count({
    where: {
      assignedTo: member.id,
      state: 'DONE',
      callList: {
        workspaceId,
      },
    },
  });

  // Count pending (QUEUED or CALLING)
  const pending = await prisma.callListItem.count({
    where: {
      assignedTo: member.id,
      state: { in: ['QUEUED', 'CALLING'] },
      callList: {
        workspaceId,
      },
    },
  });

  // Count by call list
  const byCallList = await prisma.callListItem.groupBy({
    by: ['callListId'],
    where: {
      assignedTo: member.id,
      callList: {
        workspaceId,
      },
    },
    _count: {
      id: true,
    },
  });

  // Get call list names
  const callListIds = byCallList.map((item) => item.callListId);
  const callLists = await prisma.callList.findMany({
    where: {
      id: { in: callListIds },
      workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const callListMap = new Map(callLists.map((cl) => [cl.id, cl.name]));
  const byCallListWithNames = byCallList.map((item) => ({
    callListId: item.callListId,
    callListName: callListMap.get(item.callListId) || 'Unknown',
    count: item._count.id,
  }));

  // Count by batch
  const itemsWithBatches = await prisma.callListItem.findMany({
    where: {
      assignedTo: member.id,
      callList: {
        workspaceId,
        group: {
          batchId: { not: null },
        },
      },
    },
    include: {
      callList: {
        include: {
          group: {
            include: {
              batch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const batchCounts = new Map<string, { batchId: string; batchName: string; count: number }>();
  itemsWithBatches.forEach((item) => {
    const batch = item.callList.group?.batch;
    if (batch) {
      const existing = batchCounts.get(batch.id);
      if (existing) {
        existing.count++;
      } else {
        batchCounts.set(batch.id, {
          batchId: batch.id,
          batchName: batch.name,
          count: 1,
        });
      }
    }
  });

  const byBatch = Array.from(batchCounts.values());

  // Count by group
  const itemsWithGroups = await prisma.callListItem.findMany({
    where: {
      assignedTo: member.id,
      callList: {
        workspaceId,
        groupId: { not: null },
      },
    },
    include: {
      callList: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const groupCounts = new Map<string, { groupId: string; groupName: string; count: number }>();
  itemsWithGroups.forEach((item) => {
    const group = item.callList.group;
    if (group) {
      const existing = groupCounts.get(group.id);
      if (existing) {
        existing.count++;
      } else {
        groupCounts.set(group.id, {
          groupId: group.id,
          groupName: group.name,
          count: 1,
        });
      }
    }
  });

  const byGroup = Array.from(groupCounts.values());

  // Count call logs created this week
  const startOfWeek = getStartOfWeek();
  
  const thisWeek = await prisma.callLog.count({
    where: {
      assignedTo: member.id,
      workspaceId,
      callDate: {
        gte: startOfWeek,
      },
    },
  });

  // Count call list items with follow-ups required (only for calls made by this user)
  const followUps = await prisma.callListItem.count({
    where: {
      assignedTo: member.id,
      callLogId: { not: null }, // Ensure callLog exists (completed calls only)
      callList: {
        workspaceId,
      },
      callLog: {
        followUpRequired: true,
        assignedTo: member.id, // Only count follow-ups for calls made by the logged-in user
      },
    },
  });

  return {
    totalAssigned,
    completed,
    pending,
    thisWeek,
    followUps,
    byCallList: byCallListWithNames,
    byBatch,
    byGroup,
  };
};

