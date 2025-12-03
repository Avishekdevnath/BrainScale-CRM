import { prisma } from '../../db/client';
import { DashboardFiltersInput } from './dashboard.schemas';
import { getStartOfDay, getEndOfDay, getStartOfMonth, getDaysAgo } from '../../utils/date-helpers';

const buildCallWhere = (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  if (filters?.groupId) where.groupId = filters.groupId;
  if (filters?.batchId) where.group = { batchId: filters.batchId };
  if (filters?.dateFrom || filters?.dateTo) {
    where.callDate = {};
    if (filters.dateFrom) where.callDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.callDate.lte = new Date(filters.dateTo);
  }
  return where;
};

const buildFollowupWhere = (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  if (filters?.groupId) where.groupId = filters.groupId;
  if (filters?.batchId) where.group = { batchId: filters.batchId };
  return where;
};

export const getKPIs = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const callWhere = buildCallWhere(workspaceId, filters);
  const followupWhere = buildFollowupWhere(workspaceId, filters);

  // Build student where clause
  const studentWhere: any = { workspaceId, isDeleted: false };
  if (filters?.batchId) {
    studentWhere.studentBatches = { some: { batchId: filters.batchId } };
  }

  // Get counts
  const [
    totalStudents,
    totalCalls,
    totalFollowups,
    totalGroups,
    totalCourses,
    activeCalls,
    pendingFollowups,
    overdueFollowups,
    callsToday,
    callsThisWeek,
    callsThisMonth,
  ] = await Promise.all([
    // Total students (active)
    prisma.student.count({
      where: studentWhere,
    }),
    // Total calls
    prisma.call.count({
      where: callWhere,
    }),
    // Total followups
    prisma.followup.count({
      where: followupWhere,
    }),
    // Total groups (active)
    prisma.group.count({
      where: { workspaceId, isActive: true },
    }),
    // Total courses
    prisma.course.count({
      where: { workspaceId, isActive: true },
    }),
    // Active calls (connected, in-progress)
    prisma.call.count({
      where: {
        workspaceId,
        callStatus: { in: ['CONNECTED', 'IN_PROGRESS'] },
      },
    }),
    // Pending followups
    prisma.followup.count({
      where: {
        workspaceId,
        status: 'PENDING',
        dueAt: { gte: new Date() },
      },
    }),
    // Overdue followups
    prisma.followup.count({
      where: {
        workspaceId,
        status: 'PENDING',
        dueAt: { lt: new Date() },
      },
    }),
    prisma.call.count({
      where: {
        workspaceId,
        callDate: {
          gte: getStartOfDay(),
          lte: getEndOfDay(),
        },
      },
    }),
    prisma.call.count({
      where: {
        workspaceId,
        callDate: { gte: getDaysAgo(7) },
      },
    }),
    prisma.call.count({
      where: {
        workspaceId,
        callDate: { gte: getStartOfMonth() },
      },
    }),
  ]);

  const [totalCallAttempts, successfulCalls] = await Promise.all([
    prisma.call.count({ where: { workspaceId } }),
    prisma.call.count({
      where: { workspaceId, callStatus: { in: ['CONNECTED', 'COMPLETED'] } },
    }),
  ]);

  const conversionRate = totalCallAttempts > 0 
    ? Math.round((successfulCalls / totalCallAttempts) * 10000) / 100 
    : 0;

  return {
    overview: {
      totalStudents,
      totalCalls,
      totalFollowups,
      totalGroups,
      totalCourses,
    },
    activity: {
      callsToday,
      callsThisWeek,
      callsThisMonth,
      activeCalls,
    },
    followups: {
      pending: pendingFollowups,
      overdue: overdueFollowups,
      total: totalFollowups,
    },
    metrics: {
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageCallsPerDay: callsThisWeek > 0 ? Math.round((callsThisWeek / 7) * 100) / 100 : 0,
    },
  };
};

/**
 * Get calls by status distribution
 */
export const getCallsByStatus = async (workspaceId: string, filters?: DashboardFiltersInput) => {
  const where: any = { workspaceId };
  
  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  if (filters?.batchId) {
    where.group = { batchId: filters.batchId };
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

  const calls = await prisma.call.groupBy({
    by: ['callStatus'],
    where,
    _count: {
      id: true,
    },
  });

  return calls.map((item) => ({
    status: item.callStatus,
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

  if (filters?.batchId) {
    where.group = { batchId: filters.batchId };
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

  // Fetch calls in date range
  const calls = await prisma.call.findMany({
    where: {
      workspaceId,
      callDate: {
        gte: startDate,
      },
    },
    select: {
      callDate: true,
    },
  });

  // Group by period
  const grouped: Record<string, number> = {};
  
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

  // Convert to array and sort
  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get recent activity
 */
export const getRecentActivity = async (workspaceId: string, limit: number = 20) => {
  const [recentCalls, recentFollowups] = await Promise.all([
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
 */
export const getCallLists = async (
  workspaceId: string,
  filters?: DashboardFiltersInput,
  limit: number = 10
) => {
  const where: any = { workspaceId };
  
  // Filter by groupId if provided (for group dashboard)
  if (filters?.groupId) {
    where.OR = [
      { groupId: filters.groupId },
      { groupId: null }, // Include workspace-level call lists
    ];
  }
  
  // Filter by batchId if provided
  if (filters?.batchId) {
    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { group: { batchId: filters.batchId } },
      ];
      delete where.OR;
    } else {
      where.group = { batchId: filters.batchId };
    }
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
 * Get dashboard summary (all KPIs and stats)
 */
export const getDashboardSummary = async (
  workspaceId: string,
  filters?: DashboardFiltersInput
) => {
  const [kpis, callsByStatus, followupsByStatus, studentsByGroup, studentsByBatch, callsTrend, recentActivity, callLists] =
    await Promise.all([
      getKPIs(workspaceId, filters),
      getCallsByStatus(workspaceId, filters),
      getFollowupsByStatus(workspaceId, filters),
      getStudentsByGroup(workspaceId),
      getStudentsByBatch(workspaceId),
      getCallsTrend(workspaceId, filters?.period),
      getRecentActivity(workspaceId),
      getCallLists(workspaceId, filters),
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
    },
    recentActivity,
    callLists,
  };
};

