import { prisma } from '../../db/client';
import { DashboardFiltersInput } from './dashboard.schemas';
import { getStartOfDay, getEndOfDay, getStartOfMonth, getDaysAgo } from '../../utils/date-helpers';

const buildCallWhere = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  if (filters?.groupId) where.groupId = filters.groupId;
  
  // Handle batchId filter by finding groups first
  if (filters?.batchId && !filters?.groupId) {
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        batchId: filters.batchId,
        isActive: true,
      },
      select: { id: true },
    });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
      where.groupId = { in: groupIds };
    } else {
      // No groups found for this batch, return empty result
      where.groupId = { in: [] };
    }
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    where.callDate = {};
    if (filters.dateFrom) where.callDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.callDate.lte = new Date(filters.dateTo);
  }
  return where;
};

const buildFollowupWhere = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  if (filters?.groupId) where.groupId = filters.groupId;
  
  // Handle batchId filter by finding groups first
  if (filters?.batchId && !filters?.groupId) {
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        batchId: filters.batchId,
        isActive: true,
      },
      select: { id: true },
    });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
      where.groupId = { in: groupIds };
    } else {
      // No groups found for this batch, return empty result
      where.groupId = { in: [] };
    }
  }
  return where;
};

export const getKPIs = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const callWhere = await buildCallWhere(workspaceId, filters);
  const followupWhere = await buildFollowupWhere(workspaceId, filters);

  // Build student where clause
  const studentWhere: any = { workspaceId, isDeleted: false };
  if (filters?.batchId) {
    studentWhere.studentBatches = { some: { batchId: filters.batchId } };
  }

  // Build CallLog where clause for TOTAL CALLS (lifetime - NO FILTERING)
  // Total Calls should always show lifetime count for the workspace, ignoring all filters
  const totalCallLogsWhere: any = {
    workspaceId, // Direct workspace filtering for tenant isolation only
    // NO callListId filter - show all CallLogs in workspace
    // NO date filter - show lifetime count
  };

  // Build CallLog where clause for filtered queries (today, this week, this month, etc.)
  // These can respect filters if needed
  let callListIds: string[] | null = null; // null means no filter, empty array means no matches

  // Only filter by callListId if groupId or batchId filters are applied
  const hasGroupOrBatchFilter = filters?.groupId || filters?.batchId || filters?.callerId;
  if (hasGroupOrBatchFilter) {
  // First, find call lists that match the filters
    // Include both group-specific call lists AND workspace-level call lists (groupId = null)
    const callListWhere: any = { 
      workspaceId,
      OR: [
        // Workspace-level call lists (no group)
        { groupId: null },
      ],
    };
    
  if (filters?.groupId) {
      // Also include call lists for this specific group
      callListWhere.OR.push({ groupId: filters.groupId });
  }
    
  if (filters?.batchId) {
    // Find groups with this batchId
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        batchId: filters.batchId,
        isActive: true,
      },
      select: { id: true },
    });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
        // Include call lists for groups in this batch
        callListWhere.OR.push({ groupId: { in: groupIds } });
    }
  }
  
  const matchingCallLists = await prisma.callList.findMany({
    where: callListWhere,
    select: { id: true },
  });
    callListIds = matchingCallLists.map(cl => cl.id);
    
    // If we have filters but no matching call lists, set to empty array (will return 0)
    if (callListIds.length === 0) {
      callListIds = [];
    }
  }
  // If no groupId/batchId filters, callListIds remains null - meaning don't filter by callListId
  
  // Build CallLog where clause for filtered queries
  const callLogWhere: any = {
    workspaceId, // Direct workspace filtering for tenant isolation
  };
  if (callListIds !== null) {
    // Filters are applied - filter by callListId
  if (callListIds.length > 0) {
    callLogWhere.callListId = { in: callListIds };
  } else {
      // If no call lists match filters, return empty result (no call lists match the filter criteria)
    callLogWhere.callListId = { in: [] };
    }
  }
  // If callListIds is null, don't add callListId filter - get all CallLogs in workspace
  // This happens when no groupId/batchId filters are applied
  
  if (filters?.callerId) {
    callLogWhere.assignedTo = filters.callerId;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    callLogWhere.callDate = {};
    if (filters.dateFrom) callLogWhere.callDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) callLogWhere.callDate.lte = new Date(filters.dateTo);
  }

  // Fetch connected status values for this workspace (isConnected = true)
  const connectedStatuses = await prisma.callStatusOption.findMany({
    where: { workspaceId, isConnected: true },
    select: { value: true },
  });
  const connectedStatusValues = connectedStatuses.map((s) => s.value);

  // Pending call list items (QUEUED + CALLING) — optionally filtered by caller
  const pendingItemWhere: any = {
    workspaceId,
    state: { in: ['QUEUED', 'CALLING'] },
  };
  if (filters?.callerId) {
    pendingItemWhere.assignedTo = filters.callerId;
  }
  if (callListIds !== null) {
    pendingItemWhere.callListId = callListIds.length > 0 ? { in: callListIds } : { in: [] };
  }

  // Get counts
  const [
    totalStudents,
    totalCalls,
    totalCallLogs,
    totalFollowups,
    totalGroups,
    totalCourses,
    activeCalls,
    pendingFollowups,
    overdueFollowups,
    callsToday,
    callLogsToday,
    callsThisWeek,
    callLogsThisWeek,
    callsThisMonth,
    callLogsThisMonth,
    totalFollowUpCallLogs,
    connectedCallLogs,
    pendingCallItems,
    filteredTotalCallLogs,
  ] = await Promise.all([
    // Total students (active)
    prisma.student.count({
      where: studentWhere,
    }),
    // Total calls (old Call model)
    prisma.call.count({
      where: callWhere,
    }),
    // Total call logs (new CallLog model from call lists)
    // Use totalCallLogsWhere which has NO filters - lifetime count only
    prisma.callLog.count({
      where: totalCallLogsWhere,
    }),
    // Total followups - Show all accessible follow-ups (like /api/v1/followups endpoint)
    prisma.followup.count({
      where: { workspaceId }, // Only filter by workspace, not by group
    }),
    // Total groups (active)
    prisma.group.count({
      where: { workspaceId, isActive: true },
    }),
    // Total courses
    prisma.course.count({
      where: { workspaceId, isActive: true },
    }),
    // Active calls (connected, in-progress) - old Call model
    prisma.call.count({
      where: {
        workspaceId,
        callStatus: { in: ['CONNECTED', 'IN_PROGRESS'] },
      },
    }),
    // Pending followups - Show all accessible follow-ups (like /api/v1/followups endpoint)
    // Don't filter by groupId to match the behavior of the follow-ups API
    prisma.followup.count({
      where: {
        workspaceId, // Only filter by workspace, not by group
        status: 'PENDING',
        dueAt: { gte: new Date() },
      },
    }),
    // Overdue followups - Show all accessible follow-ups (like /api/v1/followups endpoint)
    prisma.followup.count({
      where: {
        workspaceId, // Only filter by workspace, not by group
        status: 'PENDING',
        dueAt: { lt: new Date() },
      },
    }),
    // Calls today (old Call model)
    prisma.call.count({
      where: {
        workspaceId,
        callDate: {
          gte: getStartOfDay(),
          lte: getEndOfDay(),
        },
      },
    }),
    // Call logs today (new CallLog model)
    prisma.callLog.count({
      where: {
        ...callLogWhere,
        callDate: { gte: getStartOfDay(), lte: getEndOfDay() },
      },
    }),
    // Calls this week (old Call model)
    prisma.call.count({
      where: {
        workspaceId,
        callDate: { gte: getDaysAgo(7) },
      },
    }),
    // Call logs this week (new CallLog model)
    prisma.callLog.count({
      where: {
        ...callLogWhere,
        callDate: { gte: getDaysAgo(7) },
      },
    }),
    // Calls this month (old Call model)
    prisma.call.count({
      where: {
        workspaceId,
        callDate: { gte: getStartOfMonth() },
      },
    }),
    // Call logs this month (new CallLog model)
    prisma.callLog.count({
      where: {
        ...callLogWhere,
        callDate: { gte: getStartOfMonth() },
      },
    }),
    // Total follow-up calls (ALL call logs with followUpRequired: true for analytics)
    prisma.callLog.count({
      where: {
        workspaceId,
        followUpRequired: true,
      },
    }),
    // Connected call logs (status tagged isConnected=true)
    connectedStatusValues.length > 0
      ? prisma.callLog.count({
          where: {
            ...callLogWhere,
            status: { in: connectedStatusValues },
          },
        })
      : Promise.resolve(0),
    // Pending call list items (QUEUED + CALLING)
    (prisma.callListItem as any).count({ where: pendingItemWhere }),
    // Filtered total call logs (same filter as connected — denominator for connected%)
    prisma.callLog.count({ where: callLogWhere }),
  ]);

  // Combine old Call and new CallLog counts
  const totalAllCalls = totalCalls + totalCallLogs;
  const totalCallsToday = callsToday + callLogsToday;
  const totalCallsThisWeek = callsThisWeek + callLogsThisWeek;
  const totalCallsThisMonth = callsThisMonth + callLogsThisMonth;

  const [totalCallAttempts, successfulCalls, totalCallLogAttempts, successfulCallLogs] = await Promise.all([
    // Old Call model - lifetime count (no filters)
    prisma.call.count({ where: { workspaceId } }),
    prisma.call.count({
      where: { workspaceId, callStatus: { in: ['CONNECTED', 'COMPLETED'] } },
    }),
    // New CallLog model - lifetime count (no filters) for conversion rate
    prisma.callLog.count({ 
      where: { 
        workspaceId,
        // NO filters - lifetime count for conversion rate
      }
    }),
    prisma.callLog.count({
      where: { 
        workspaceId,
        // NO filters - lifetime count for conversion rate
        status: { in: ['completed'] },
      },
    }),
  ]);

  const totalAllCallAttempts = totalCallAttempts + totalCallLogAttempts;
  const totalSuccessfulCalls = successfulCalls + successfulCallLogs;
  const conversionRate = totalAllCallAttempts > 0 
    ? Math.round((totalSuccessfulCalls / totalAllCallAttempts) * 10000) / 100 
    : 0;

  const connectedPercent = filteredTotalCallLogs > 0
    ? Math.round((connectedCallLogs / filteredTotalCallLogs) * 10000) / 100
    : 0;

  return {
    overview: {
      totalStudents,
      totalCalls: totalAllCalls, // Combined old Call + new CallLog
      totalFollowups,
      totalGroups,
      totalCourses,
    },
    activity: {
      callsToday: totalCallsToday,
      callsThisWeek: totalCallsThisWeek,
      callsThisMonth: totalCallsThisMonth,
      activeCalls,
    },
    followups: {
      pending: pendingFollowups,
      overdue: overdueFollowups,
      total: totalFollowups,
      totalFollowUpCalls: totalFollowUpCallLogs,
    },
    metrics: {
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageCallsPerDay: callsThisWeek > 0 ? Math.round((callsThisWeek / 7) * 100) / 100 : 0,
      connectedCalls: connectedCallLogs,
      connectedPercent,
      pendingCalls: pendingCallItems,
    },
  };
};

/**
 * Get calls by status distribution
 */
export const getCallsByStatus = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };

  // CallLog has no direct groupId/batchId — resolve via CallList first, same as getKPIs
  if (filters?.groupId || filters?.batchId) {
    const callListWhere: any = {
      workspaceId,
      OR: [{ groupId: null }],
    };
    if (filters.groupId) {
      callListWhere.OR.push({ groupId: filters.groupId });
    }
    if (filters.batchId) {
      const groups = await prisma.group.findMany({
        where: { workspaceId, batchId: filters.batchId, isActive: true },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);
      if (groupIds.length > 0) {
        callListWhere.OR.push({ groupId: { in: groupIds } });
      }
    }
    const matchingCallLists = await prisma.callList.findMany({
      where: callListWhere,
      select: { id: true },
    });
    const callListIds = matchingCallLists.map((cl) => cl.id);
    where.callListId = callListIds.length > 0 ? { in: callListIds } : { in: [] };
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.callDate = {};
    if (filters.dateFrom) {
      where.callDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.callDate.lte = new Date(filters.dateTo);
    }
  }

  const calls = await prisma.callLog.groupBy({
    by: ['status'],
    where,
    _count: {
      id: true,
    },
  });

  return calls.map((item) => ({
    status: item.status,
    count: item._count.id,
  }));
};

/**
 * Get followups by status distribution
 */
export const getFollowupsByStatus = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  
  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  // Handle batchId filter by finding groups first
  if (filters?.batchId && !filters?.groupId) {
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        batchId: filters.batchId,
        isActive: true,
      },
      select: { id: true },
    });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
      where.groupId = { in: groupIds };
    } else {
      // No groups found for this batch, return empty result
      where.groupId = { in: [] };
    }
  }

  const followups = await prisma.followup.groupBy({
    by: ['status'],
    where,
    _count: {
      id: true,
    },
  });

  return followups.map((item) => ({
    status: item.status,
    count: item._count.id,
  }));
};

/**
 * Get students by group distribution
 */
export const getStudentsByGroup = async (workspaceId: string) => {
  const groups = await prisma.group.findMany({
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
  });

  return groups.map((group) => ({
    groupId: group.id,
    groupName: group.name,
    studentCount: group._count.statuses,
  }));
};

/**
 * Get students by batch distribution
 */
export const getStudentsByBatch = async (workspaceId: string) => {
  const batches = await prisma.batch.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          studentBatches: true,
        },
      },
    },
  });

  return batches.map((batch) => ({
    batchId: batch.id,
    batchName: batch.name,
    studentCount: batch._count.studentBatches,
  }));
};

/**
 * Get calls trend over time
 */
export const getCallsTrend = async (
  workspaceId: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
) => {
  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  let interval: string;

  switch (period) {
    case 'day':
      startDate = new Date(now.setDate(now.getDate() - 30));
      interval = 'day';
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 12 * 7));
      interval = 'week';
      break;
    case 'month':
      startDate = new Date(now.setFullYear(now.getFullYear() - 12));
      interval = 'month';
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 5));
      interval = 'year';
      break;
  }

  // Fetch calls and call logs in date range - now with direct workspaceId!
  const [calls, callLogs] = await Promise.all([
    prisma.call.findMany({
      where: {
        workspaceId,
        callDate: {
          gte: startDate,
        },
      },
      select: {
        callDate: true,
      },
    }),
    prisma.callLog.findMany({
      where: {
        workspaceId, // Direct workspace filtering for tenant isolation
        callDate: {
          gte: startDate,
        },
      },
      select: {
        callDate: true,
      },
    }),
  ]);

  // Group by period
  const grouped: Record<string, number> = {};
  
  // Process old Call records
  calls.forEach((call) => {
    const date = new Date(call.callDate);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${weekStart.toISOString().split('T')[0]}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    grouped[key] = (grouped[key] || 0) + 1;
  });

  // Process new CallLog records
  callLogs.forEach((callLog) => {
    const date = new Date(callLog.callDate);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${weekStart.toISOString().split('T')[0]}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    grouped[key] = (grouped[key] || 0) + 1;
  });

  // Convert to array and sort
  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get follow-ups trend over time (pending vs overdue)
 * Groups followups by period and separates pending vs overdue status
 */
export const getFollowupsTrend = async (
  workspaceId: string,
  filters?: DashboardFiltersInput,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
) => {
  // Calculate date range based on period (same as getCallsTrend)
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 12 * 7));
      break;
    case 'month':
      startDate = new Date(now.setFullYear(now.getFullYear() - 12));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 5));
      break;
  }

  // Build where clause for followups with filters
  const followupWhere: any = { workspaceId };
  if (filters?.groupId) followupWhere.groupId = filters.groupId;

  // Handle batchId filter by finding groups first
  if (filters?.batchId && !filters?.groupId) {
    const groups = await prisma.group.findMany({
      where: {
        workspaceId,
        batchId: filters.batchId,
        isActive: true,
      },
      select: { id: true },
    });
    const groupIds = groups.map(g => g.id);
    if (groupIds.length > 0) {
      followupWhere.groupId = { in: groupIds };
    } else {
      followupWhere.groupId = { in: [] };
    }
  }

  // Fetch followups in date range
  const followups = await prisma.followup.findMany({
    where: {
      ...followupWhere,
      dueAt: {
        gte: startDate,
      },
    },
    select: {
      dueAt: true,
      status: true,
    },
  });

  // Group by period and separate pending vs overdue
  const grouped: Record<string, { pending: number; overdue: number }> = {};
  const currentTime = new Date();

  followups.forEach((followup) => {
    const dueDate = new Date(followup.dueAt);
    let key: string;

    switch (period) {
      case 'day':
        key = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(dueDate);
        weekStart.setDate(dueDate.getDate() - dueDate.getDay());
        key = `Week ${weekStart.toISOString().split('T')[0]}`;
        break;
      case 'month':
        key = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(dueDate.getFullYear());
        break;
    }

    // Determine if pending or overdue
    const isOverdue = followup.status === 'PENDING' && dueDate < currentTime;
    const isPending = followup.status === 'PENDING' && dueDate >= currentTime;

    if (!grouped[key]) {
      grouped[key] = { pending: 0, overdue: 0 };
    }

    if (isOverdue) grouped[key].overdue++;
    if (isPending) grouped[key].pending++;
  });

  // Convert to array and sort by date
  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (workspaceId: string, limit: number = 20) => {
  const [recentCalls, recentCallLogs, recentFollowups] = await Promise.all([
    prisma.call.findMany({
      where: { workspaceId },
      take: limit,
      orderBy: { callDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.callLog.findMany({
      where: { workspaceId }, // Direct workspace filtering for tenant isolation
      take: limit,
      orderBy: { callDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        callList: {
          select: {
            id: true,
            name: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.followup.findMany({
      where: { workspaceId },
      take: limit,
      orderBy: { dueAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  // Combine and sort by date
  const activities = [
    ...recentCalls.map((call) => ({
      type: 'call' as const,
      id: call.id,
      date: call.callDate,
      studentName: call.student.name,
      groupName: call.group.name,
      status: call.callStatus,
      description: `Call with ${call.student.name}`,
    })),
    ...recentCallLogs.map((callLog) => ({
      type: 'call' as const,
      id: callLog.id,
      date: callLog.callDate,
      studentName: callLog.student.name,
      groupName: callLog.callList?.group?.name || 'N/A',
      status: callLog.status,
      description: `Call with ${callLog.student.name}`,
    })),
    ...recentFollowups.map((followup) => ({
      type: 'followup' as const,
      id: followup.id,
      date: followup.dueAt,
      studentName: followup.student.name,
      groupName: followup.group.name,
      status: followup.status,
      description: `Followup for ${followup.student.name}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);

  return activities;
};

/**
 * Get call lists for dashboard
 * Matches the behavior of /api/v1/call-lists endpoint - shows ALL call lists in workspace
 * Similar to follow-ups, don't filter by groupId to show all accessible call lists
 */
export const getCallLists = async (
  workspaceId: string,
  filters?: DashboardFiltersInput,
  limit: number = 10
) => {
  const where: any = { workspaceId };
  
  // Show ALL call lists in workspace (like /api/v1/call-lists endpoint when no groupId filter)
  // Don't filter by groupId to match the call-lists page behavior
  // Only filter by batchId if provided (via group's batchId)
  if (filters?.batchId) {
    where.group = { batchId: filters.batchId };
  }
  
  const callLists = await prisma.callList.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });
  
  return callLists.map((list) => ({
    id: list.id,
    name: list.name,
    groupId: list.groupId,
    group: list.group,
    itemCount: list._count.items,
    source: list.source,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  }));
};

/**
 * Get assignee performance (calls + connected calls per caller, top 10)
 */
export const getAssigneePerformance = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  if (filters?.callerId) where.assignedTo = filters.callerId;
  if (filters?.dateFrom || filters?.dateTo) {
    where.callDate = {};
    if (filters?.dateFrom) where.callDate.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.callDate.lte = new Date(filters.dateTo);
  }

  const grouped = await prisma.callLog.groupBy({
    by: ['assignedTo'],
    where,
    _count: { assignedTo: true },
    orderBy: { _count: { assignedTo: 'desc' } },
    take: 10,
  });

  if (grouped.length === 0) return [];

  const assigneeIds = grouped.map((g) => g.assignedTo);

  const connectedStatuses = await prisma.callStatusOption.findMany({
    where: { workspaceId, isConnected: true },
    select: { value: true },
  });
  const connectedValues = connectedStatuses.map((s) => s.value);

  const members = await prisma.workspaceMember.findMany({
    where: { id: { in: assigneeIds }, workspaceId },
    include: { user: { select: { name: true, email: true } } },
  });
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.user.name || m.user.email]));

  const connectedCounts: Record<string, number> = {};
  if (connectedValues.length > 0) {
    const connectedGrouped = await prisma.callLog.groupBy({
      by: ['assignedTo'],
      where: { ...where, status: { in: connectedValues }, assignedTo: { in: assigneeIds } },
      _count: { assignedTo: true },
    });
    connectedGrouped.forEach((g) => { connectedCounts[g.assignedTo] = g._count.assignedTo; });
  }

  return grouped.map((g, i) => ({
    rank: i + 1,
    assigneeId: g.assignedTo,
    assignee: memberMap[g.assignedTo] || 'Unknown',
    totalCalls: g._count.assignedTo,
    connectedCalls: connectedCounts[g.assignedTo] || 0,
  }));
};

/**
 * Get dashboard summary (all KPIs and stats)
 */
export const getDashboardSummary = async (
  workspaceId: string,
  filters?: DashboardFiltersInput
) => {
  const [kpis, callsByStatus, followupsByStatus, studentsByGroup, studentsByBatch, callsTrend, followupsTrend, recentActivity, callLists, assigneePerformance] =
    await Promise.all([
      getKPIs(workspaceId, filters),
      getCallsByStatus(workspaceId, filters),
      getFollowupsByStatus(workspaceId, filters),
      getStudentsByGroup(workspaceId),
      getStudentsByBatch(workspaceId),
      getCallsTrend(workspaceId, filters?.period),
      getFollowupsTrend(workspaceId, filters, filters?.period),
      getRecentActivity(workspaceId),
      getCallLists(workspaceId, filters),
      getAssigneePerformance(workspaceId, filters),
    ]);

  return {
    kpis,
    distributions: {
      callsByStatus,
      followupsByStatus,
      studentsByGroup,
      studentsByBatch,
    },
    trends: {
      callsTrend,
      followupsTrend,
    },
    recentActivity,
    callLists,
    assigneePerformance,
  };
};

