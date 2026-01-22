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

  if (options.q) {
    const query = options.q.trim();
    if (query.length > 0) {
      const phoneDigits = query.replace(/\D/g, '');
      where.student = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          ...(phoneDigits.length > 0
            ? [
                {
                  phones: {
                    some: {
                      phone: { contains: phoneDigits },
                    },
                  },
                },
              ]
            : []),
        ],
      };
    }
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  // Filter by follow-ups required
  // NOTE: We don't filter in Prisma query because we need to check the LATEST call log,
  // not any historical call log. We'll filter after fetching.
  if (options.followUpRequired !== undefined) {
    // Only fetch items that have at least one call log (completed calls)
    where.callLogs = {
      some: {
        assignedTo: member.id, // Only show calls made by the logged-in user
      },
    };
    // We'll filter by followUpRequired after fetching, based on latest call log
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
        callLogs: {
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
          orderBy: {
            callDate: 'desc',
          },
          take: 1, // Get only the latest call log for backward compatibility
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

  // Extract questions from call list meta and add callLog for backward compatibility
  const itemsWithQuestions = items.map((item) => {
    const questions = (item.callList.meta as any)?.questions || [];
    const messages = item.callList.messages || [];
    const latestCallLog = item.callLogs && item.callLogs.length > 0 ? item.callLogs[0] : null;
    
    return {
      ...item,
      callList: {
        ...item.callList,
        questions,
        messages,
      },
      // Add callLog field for backward compatibility (latest call log)
      callLog: latestCallLog,
    };
  });

  // Filter by follow-up status based on LATEST call log only
  let filteredItems = itemsWithQuestions;
  if (options.followUpRequired !== undefined) {
    filteredItems = itemsWithQuestions.filter((item) => {
      const latestCallLog = item.callLog;
      if (!latestCallLog) return false; // No call log = no follow-up
      
      // Check if latest call log matches the follow-up requirement
      if (options.followUpRequired) {
        // Only show if latest call log requires follow-up AND was made by this user
        return latestCallLog.followUpRequired === true && 
               latestCallLog.assignedTo === member.id;
      } else {
        // Show if latest call log does NOT require follow-up
        return latestCallLog.followUpRequired !== true;
      }
    });
  }

  // Recalculate pagination after filtering
  const filteredTotal = filteredItems.length;
  const paginatedItems = filteredItems.slice(skip, skip + size);

  return {
    items: paginatedItems,
    pagination: {
      page,
      size,
      total: filteredTotal, // Use filtered total
      totalPages: Math.ceil(filteredTotal / size),
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

  // 1. Pending follow-ups (items where LATEST call log requires follow-up)
  const itemsWithCallLogs = await prisma.callListItem.findMany({
    where: {
      assignedTo: member.id,
      callList: {
        workspaceId,
      },
      callLogs: {
        some: {
          assignedTo: member.id,
        },
      },
    },
    include: {
      callLogs: {
        orderBy: { callDate: 'desc' },
        take: 1,
        select: {
          followUpRequired: true,
          assignedTo: true,
        },
      },
    },
  });

  const followUps = itemsWithCallLogs.filter((item) => {
    const latestCallLog = item.callLogs[0];
    return latestCallLog && 
           latestCallLog.followUpRequired === true && 
           latestCallLog.assignedTo === member.id;
  }).length;

  // 2. Total follow-up calls (ALL call logs with followUpRequired: true for analytics)
  const totalFollowUpCalls = await prisma.callLog.count({
    where: {
      assignedTo: member.id,
      workspaceId,
      followUpRequired: true,
    },
  });

  return {
    totalAssigned,
    completed,
    pending,
    thisWeek,
    followUps, // Pending follow-ups (items where latest call log requires follow-up)
    totalFollowUpCalls, // Total follow-up calls for analytics (all call logs with followUpRequired: true)
    byCallList: byCallListWithNames,
    byBatch,
    byGroup,
  };
};

/**
 * Get all calls in workspace (not filtered by assignedTo)
 */
export const getAllCalls = async (
  workspaceId: string,
  options: GetMyCallsInput
) => {
  // Build where clause: all calls in workspace (no assignedTo filter)
  const where: any = {
    callList: {
      workspaceId,
    },
  };

  // Apply filters
  if (options.state) {
    where.state = options.state;
  }

  if (options.q) {
    const query = options.q.trim();
    if (query.length > 0) {
      const phoneDigits = query.replace(/\D/g, '');
      where.student = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          ...(phoneDigits.length > 0
            ? [
                {
                  phones: {
                    some: {
                      phone: { contains: phoneDigits },
                    },
                  },
                },
              ]
            : []),
        ],
      };
    }
  }

  if (options.callListId) {
    where.callListId = options.callListId;
  }

  // Filter by follow-ups required
  // NOTE: We don't filter in Prisma query because we need to check the LATEST call log,
  // not any historical call log. We'll filter after fetching.
  if (options.followUpRequired !== undefined) {
    // Only fetch items that have at least one call log (completed calls)
    where.callLogs = {
      some: {}, // Just check that call logs exist
    };
    // We'll filter by followUpRequired after fetching, based on latest call log
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
    where.callList = {
      ...where.callList,
      group: {
        batchId: options.batchId,
      },
    };
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
        callLogs: {
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
          orderBy: {
            callDate: 'desc',
          },
          take: 1, // Get only the latest call log for backward compatibility
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

  // Extract questions from call list meta and add callLog for backward compatibility
  const itemsWithQuestions = items.map((item) => {
    const questions = (item.callList.meta as any)?.questions || [];
    const messages = item.callList.messages || [];
    const latestCallLog = item.callLogs && item.callLogs.length > 0 ? item.callLogs[0] : null;
    
    return {
      ...item,
      callList: {
        ...item.callList,
        questions,
        messages,
      },
      // Add callLog field for backward compatibility (latest call log)
      callLog: latestCallLog,
    };
  });

  // Filter by follow-up status based on LATEST call log only
  let filteredItems = itemsWithQuestions;
  if (options.followUpRequired !== undefined) {
    filteredItems = itemsWithQuestions.filter((item) => {
      const latestCallLog = item.callLog;
      if (!latestCallLog) return false; // No call log = no follow-up
      
      // Check if latest call log matches the follow-up requirement
      if (options.followUpRequired) {
        // Only show if latest call log requires follow-up
        return latestCallLog.followUpRequired === true;
      } else {
        // Show if latest call log does NOT require follow-up
        return latestCallLog.followUpRequired !== true;
      }
    });
  }

  // Recalculate pagination after filtering
  const filteredTotal = filteredItems.length;
  const paginatedItems = filteredItems.slice(skip, skip + size);

  return {
    items: paginatedItems,
    pagination: {
      page,
      size,
      total: filteredTotal, // Use filtered total
      totalPages: Math.ceil(filteredTotal / size),
    },
  };
};

