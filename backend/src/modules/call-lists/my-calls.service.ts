import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { getStartOfWeek } from '../../utils/date-helpers';
import { normalizePhoneQuery } from '../../utils/phone';
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

  // Build where clause: filter by the item's OWN workspaceId (not via the
  // callList relation) so the [workspaceId, assignedTo, state] index engages.
  const where: any = {
    workspaceId,
    assignedTo: member.id,
  };

  // Apply filters
  if (options.states && options.states.length > 0) {
    where.state = options.states.length === 1 ? options.states[0] : { in: options.states };
  } else if (options.state) {
    where.state = options.state;
  }

  if (options.q) {
    const query = options.q.trim();
    if (query.length > 0) {
      const phoneDigits = normalizePhoneQuery(query);
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

  // Group/batch filters genuinely need the callList relation (the item doesn't
  // store groupId/batchId). Only attach where.callList when one is requested.
  if (options.groupId) {
    where.callList = { ...where.callList, groupId: options.groupId };
  }
  if (options.batchId) {
    where.callList = { ...where.callList, group: { batchId: options.batchId } };
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
        { serialNumber: 'asc' },
      ],
      skip,
      take: size,
    }),
    prisma.callListItem.count({ where }),
  ]);

  // Extract questions + statusOptions + columns from call list meta
  const itemsWithQuestions = items.map((item) => {
    const meta = (item.callList.meta as any) || {};
    const questions = meta.questions || [];
    const statusOptions = meta.statusOptions || [];
    const columns = meta.columns || [];
    const messages = item.callList.messages || [];
    const latestCallLog = item.callLogs && item.callLogs.length > 0 ? item.callLogs[0] : null;

    return {
      ...item,
      callList: {
        ...item.callList,
        questions,
        statusOptions,
        columns,
        messages,
      },
      // Add callLog field for backward compatibility (latest call log)
      callLog: latestCallLog,
    };
  });

  // When followUpRequired filter is active, we need to filter in-memory
  // because we can't query by "latest call log's followUpRequired" in Prisma.
  // In this case, skip DB-level pagination and do it all in-memory.
  if (options.followUpRequired !== undefined) {
    // We already fetched a paginated subset — but for follow-up filtering
    // we need ALL matching items. Re-fetch without pagination.
    const allItems = await prisma.callListItem.findMany({
      where,
      include: {
        callList: {
          include: {
            group: {
              include: {
                batch: {
                  select: { id: true, name: true },
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
              select: { phone: true, isPrimary: true },
            },
          },
        },
        assignee: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
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
          orderBy: { callDate: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { priority: 'desc' },
        { serialNumber: 'asc' },
      ],
    });

    const allItemsWithQuestions = allItems.map((item) => {
      const meta = (item.callList.meta as any) || {};
      const questions = meta.questions || [];
      const statusOptions = meta.statusOptions || [];
      const columns = meta.columns || [];
      const messages = item.callList.messages || [];
      const latestCallLog = item.callLogs && item.callLogs.length > 0 ? item.callLogs[0] : null;
      return {
        ...item,
        callList: { ...item.callList, questions, statusOptions, columns, messages },
        callLog: latestCallLog,
      };
    });

    const filtered = allItemsWithQuestions.filter((item) => {
      const latestCallLog = item.callLog;
      if (!latestCallLog) return false;
      if (options.followUpRequired) {
        return latestCallLog.followUpRequired === true &&
               latestCallLog.assignedTo === member.id;
      } else {
        return latestCallLog.followUpRequired !== true;
      }
    });

    const filteredTotal = filtered.length;
    const paginatedItems = filtered.slice(skip, skip + size);

    return {
      items: paginatedItems,
      pagination: {
        page,
        size,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / size),
      },
    };
  }

  // Non-follow-up path: DB already handled pagination correctly
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

  // Counts filter by the item's OWN workspaceId so the
  // [workspaceId, assignedTo, state] index engages (no relation round-trip).
  const totalAssigned = await prisma.callListItem.count({
    where: { workspaceId, assignedTo: member.id },
  });

  // Count completed (DONE)
  const completed = await prisma.callListItem.count({
    where: { workspaceId, assignedTo: member.id, state: 'DONE' },
  });

  // Count pending (QUEUED or CALLING)
  const pending = await prisma.callListItem.count({
    where: { workspaceId, assignedTo: member.id, state: { in: ['QUEUED', 'CALLING'] } },
  });

  // Count by call list (one grouped query — no item hauling)
  const byCallList = await prisma.callListItem.groupBy({
    by: ['callListId'],
    where: { workspaceId, assignedTo: member.id },
    _count: { id: true },
  });

  // Fetch each call list's name + group + batch in a single query, then derive
  // byCallList / byBatch / byGroup from the grouped counts above. This replaces
  // two unbounded findMany scans over every assigned item.
  const callListIds = byCallList.map((item) => item.callListId);
  const callLists = await prisma.callList.findMany({
    where: { id: { in: callListIds }, workspaceId },
    select: {
      id: true,
      name: true,
      group: {
        select: {
          id: true,
          name: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });
  const callListMap = new Map(callLists.map((cl) => [cl.id, cl]));

  const byCallListWithNames = byCallList.map((item) => ({
    callListId: item.callListId,
    callListName: callListMap.get(item.callListId)?.name || 'Unknown',
    count: item._count.id,
  }));

  // Aggregate per-call-list counts up into batch and group totals in memory.
  const batchCounts = new Map<string, { batchId: string; batchName: string; count: number }>();
  const groupCounts = new Map<string, { groupId: string; groupName: string; count: number }>();
  for (const item of byCallList) {
    const cl = callListMap.get(item.callListId);
    const count = item._count.id;
    const group = cl?.group;
    if (group) {
      const g = groupCounts.get(group.id);
      if (g) g.count += count;
      else groupCounts.set(group.id, { groupId: group.id, groupName: group.name, count });

      const batch = group.batch;
      if (batch) {
        const b = batchCounts.get(batch.id);
        if (b) b.count += count;
        else batchCounts.set(batch.id, { batchId: batch.id, batchName: batch.name, count });
      }
    }
  }

  const byBatch = Array.from(batchCounts.values());
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
  // TODO: denormalize latestFollowUpRequired onto CallListItem to remove this scan.
  const itemsWithCallLogs = await prisma.callListItem.findMany({
    where: {
      workspaceId,
      assignedTo: member.id,
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
  // Build where clause: filter by the item's OWN workspaceId (not via the
  // callList relation) so the [workspaceId, state] index engages.
  const where: any = {
    workspaceId,
  };

  // Apply filters
  if (options.states && options.states.length > 0) {
    where.state = options.states.length === 1 ? options.states[0] : { in: options.states };
  } else if (options.state) {
    where.state = options.state;
  }

  if (options.q) {
    const query = options.q.trim();
    if (query.length > 0) {
      const phoneDigits = normalizePhoneQuery(query);
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

  // Filter by assigned member (caller)
  if (options.assignedTo) {
    where.assignedTo = options.assignedTo;
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
        { updatedAt: 'desc' },
      ],
      skip,
      take: size,
    }),
    prisma.callListItem.count({ where }),
  ]);

  // Extract questions + statusOptions + columns from call list meta
  const itemsWithQuestions = items.map((item) => {
    const meta = (item.callList.meta as any) || {};
    const questions = meta.questions || [];
    const statusOptions = meta.statusOptions || [];
    const columns = meta.columns || [];
    const messages = item.callList.messages || [];
    const latestCallLog = item.callLogs && item.callLogs.length > 0 ? item.callLogs[0] : null;

    return {
      ...item,
      callList: {
        ...item.callList,
        questions,
        statusOptions,
        columns,
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

