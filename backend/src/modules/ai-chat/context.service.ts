import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import * as dashboardService from '../dashboard/dashboard.service';
import { getStartOfDay, getEndOfDay } from '../../utils/date-helpers';

/**
 * Get student information by name
 */
export const getStudentInfo = async (
  studentName: string,
  workspaceId: string
): Promise<any> => {
  // If studentName is generic/empty, check if there's only one student
  const genericNames = ['student', 'students', 'info', 'information', 'details', 'detail', ''];
  const isGenericRequest = !studentName || genericNames.some(generic => 
    studentName.trim().toLowerCase() === generic
  );

  if (isGenericRequest) {
    // Get total student count
    const totalStudents = await prisma.student.count({
      where: {
        workspaceId,
        isDeleted: false,
      },
    });

    // If there's exactly one student, return that student's info
    if (totalStudents === 1) {
      const student = await prisma.student.findFirst({
        where: {
          workspaceId,
          isDeleted: false,
        },
        include: {
          phones: true,
          enrollments: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          callLogs: {
            take: 5,
            orderBy: { callDate: 'desc' },
            select: {
              id: true,
              callDate: true,
              status: true,
              summaryNote: true,
            },
          },
        },
      });

      if (student) {
        return {
          found: true,
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            phones: student.phones.map(p => p.phone),
            tags: student.tags,
            enrollments: student.enrollments.map(e => ({
              group: e.group.name,
            })),
            recentCalls: student.callLogs.length,
            lastCallDate: student.callLogs[0]?.callDate || null,
          },
        };
      }
    } else if (totalStudents === 0) {
      return { found: false, message: 'No students found in this workspace' };
    } else {
      // Multiple students - need a specific name
      return { 
        found: false, 
        message: `There are ${totalStudents} students in this workspace. Please specify which student you'd like information about by providing their name.` 
      };
    }
  }

  // Search for student by name
  const student = await prisma.student.findFirst({
    where: {
      workspaceId,
      name: { contains: studentName, mode: 'insensitive' },
      isDeleted: false,
    },
    include: {
      phones: true,
      enrollments: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      callLogs: {
        take: 5,
        orderBy: { callDate: 'desc' },
        select: {
          id: true,
          callDate: true,
          status: true,
          summaryNote: true,
        },
      },
    },
  });

  if (!student) {
    return { found: false, message: `Student "${studentName}" not found in this workspace` };
  }

  return {
    found: true,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phones: student.phones.map(p => p.phone),
      tags: student.tags,
      enrollments: student.enrollments.map(e => ({
        group: e.group.name,
      })),
      recentCalls: student.callLogs.length,
      lastCallDate: student.callLogs[0]?.callDate || null,
    },
  };
};

/**
 * Search students by query
 */
export const searchStudents = async (
  query: string,
  workspaceId: string,
  limit: number = 10
): Promise<any> => {
  const students = await prisma.student.findMany({
    where: {
      workspaceId,
      isDeleted: false,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      tags: true,
      phones: {
        select: { phone: true, isPrimary: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    count: students.length,
    students: students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      tags: s.tags,
      primaryPhone: s.phones?.find(p => p.isPrimary)?.phone || s.phones?.[0]?.phone || null,
    })),
  };
};

/**
 * Get call logs with filters
 */
export const getCallLogs = async (
  filters: {
    studentId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    today?: boolean; // Special flag for "today" filtering
  },
  workspaceId: string
): Promise<any> => {
  try {
    const where: any = { workspaceId };

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Handle "today" filtering - check for explicit flag
    const isTodayFilter = filters.today === true;

    if (isTodayFilter) {
      where.callDate = {
        gte: getStartOfDay(),
        lte: getEndOfDay(),
      };
    } else if (filters.dateFrom || filters.dateTo) {
      where.callDate = {};
    if (filters.dateFrom) {
      // Handle ISO date strings
      const fromDate = typeof filters.dateFrom === 'string' 
        ? new Date(filters.dateFrom)
        : filters.dateFrom;
      where.callDate.gte = fromDate;
    }
    if (filters.dateTo) {
      // Handle ISO date strings
      const toDate = typeof filters.dateTo === 'string'
        ? new Date(filters.dateTo)
        : filters.dateTo;
      where.callDate.lte = toDate;
    }
    }

    // When filtering for today, use a higher limit to get all calls (or no limit)
    // For other queries, use the provided limit or default
    const limit = isTodayFilter ? (filters.limit || 1000) : (filters.limit || 20);

    // For accurate unique student count, especially when filtering for today,
    // do a separate query to get all studentIds (without limit)
    let uniqueStudentsCount = 0;
    if (isTodayFilter || filters.dateFrom || filters.dateTo) {
      try {
        // Get all call logs with just studentId for unique count (no limit)
        const allCallLogsForCount = await prisma.callLog.findMany({
          where: {
            ...where,
            studentId: { not: null },
          },
          select: {
            studentId: true,
          },
        });
        const uniqueStudentIds = new Set(
          allCallLogsForCount
            .map(log => log.studentId)
            .filter((id): id is string => id !== null && id !== undefined)
        );
        uniqueStudentsCount = uniqueStudentIds.size;
      } catch (countError) {
        // If counting fails, we'll calculate from the returned results below
        // This is a fallback to ensure the function still works
      }
    }

    // Get the real total count (not limited by the take)
    const totalCount = await prisma.callLog.count({ where });

    const callLogs = await prisma.callLog.findMany({
      where,
      take: limit,
      orderBy: { callDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // If we didn't calculate unique students above, calculate from returned results
    if (uniqueStudentsCount === 0 && (!isTodayFilter && !filters.dateFrom && !filters.dateTo)) {
      const uniqueStudentIds = new Set(
        callLogs
          .filter(log => log.studentId)
          .map(log => log.studentId)
      );
      uniqueStudentsCount = uniqueStudentIds.size;
    } else if (uniqueStudentsCount === 0 && (isTodayFilter || filters.dateFrom || filters.dateTo)) {
      // Fallback: calculate from returned results if the count query failed
      const uniqueStudentIds = new Set(
        callLogs
          .filter(log => log.studentId)
          .map(log => log.studentId)
      );
      uniqueStudentsCount = uniqueStudentIds.size;
    }

    return {
      total: totalCount,
      count: callLogs.length,
      uniqueStudentsCount,
      callLogs: callLogs.map(log => ({
        id: log.id,
        studentId: log.studentId,
        studentName: log.student?.name,
        status: log.status,
        callDate: log.callDate,
        callerName: log.assignee?.user?.name,
        summaryNote: log.summaryNote,
        sentiment: log.sentiment,
      })),
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in getCallLogs:', error);
    throw error;
  }
};

/**
 * Get workspace statistics
 */
export const getWorkspaceStats = async (workspaceId: string): Promise<any> => {
  try {
    const [kpis, studentCount, callLogCount, groupBreakdown, studentsWithTags] = await Promise.all([
      dashboardService.getKPIs(workspaceId),
      prisma.student.count({ where: { workspaceId, isDeleted: false } }),
      prisma.callLog.count({ where: { workspaceId } }),
      prisma.group.findMany({
        where: { workspaceId, isActive: true },
        select: { name: true, _count: { select: { enrollments: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.student.findMany({
        where: { workspaceId, isDeleted: false },
        select: { tags: true },
      }),
    ]);

    // Top groups by student count
    const topGroups = groupBreakdown
      .sort((a, b) => b._count.enrollments - a._count.enrollments)
      .slice(0, 10)
      .map(g => ({ name: g.name, studentCount: g._count.enrollments }));

    // Top tags by frequency
    const tagCounts = new Map<string, number>();
    for (const s of studentsWithTags) {
      for (const tag of s.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      studentCount,
      totalCallsAllTime: callLogCount,
      overview: kpis.overview,
      activity: kpis.activity,
      followups: kpis.followups,
      metrics: kpis.metrics,
      topGroups,
      topTags,
    };
  } catch (error) {
    return { error: 'Failed to retrieve workspace statistics' };
  }
};

/**
 * Get recent workspace activity
 */
export const getRecentActivity = async (
  workspaceId: string,
  limit: number = 10
): Promise<any> => {
  const [recentCallLogs, recentFollowups] = await Promise.all([
    prisma.callLog.findMany({
      where: { workspaceId },
      take: limit,
      orderBy: { callDate: 'desc' },
      include: {
        student: {
          select: {
            name: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.followup.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
      },
      take: limit,
      orderBy: { dueAt: 'asc' },
      include: {
        student: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    recentCalls: recentCallLogs.map(log => ({
      id: log.id,
      studentName: log.student?.name,
      status: log.status,
      date: log.callDate,
    })),
    upcomingFollowups: recentFollowups.map(f => ({
      id: f.id,
      studentName: f.student?.name,
      dueDate: f.dueAt,
    })),
  };
};

/**
 * Get follow-ups with filters
 */
export const getFollowups = async (
  filters: {
    status?: string;
    studentId?: string;
    limit?: number;
  },
  workspaceId: string
): Promise<any> => {
  const where: any = { workspaceId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.studentId) {
    where.studentId = filters.studentId;
  }

  const limit = filters.limit || 20;

  const followups = await prisma.followup.findMany({
    where,
    take: limit,
    orderBy: { dueAt: 'asc' },
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
  });

  return {
    count: followups.length,
    followups: followups.map(f => ({
      id: f.id,
      studentName: f.student?.name,
      groupName: f.group?.name,
      status: f.status,
      dueDate: f.dueAt,
      notes: f.notes,
    })),
  };
};

/**
 * Get groups in the workspace
 */
export const getGroups = async (workspaceId: string): Promise<any> => {
  const groups = await prisma.group.findMany({
    where: { workspaceId, isActive: true },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          enrollments: true,
          callLists: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    count: groups.length,
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      studentCount: g._count.enrollments,
      callListCount: g._count.callLists,
    })),
  };
};

/**
 * Get caller (counselor) performance stats
 */
export const getCallerPerformance = async (
  workspaceId: string,
  limit: number = 10,
  dateFrom?: string,
  dateTo?: string
): Promise<any> => {
  const where: any = { workspaceId };

  if (dateFrom || dateTo) {
    where.callDate = {};
    if (dateFrom) where.callDate.gte = new Date(dateFrom);
    if (dateTo) where.callDate.lte = new Date(dateTo);
  }

  const callLogs = await prisma.callLog.findMany({
    where,
    select: {
      assignedTo: true,
      status: true,
      assignee: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  // Aggregate by caller in memory
  const callerMap = new Map<string, {
    name: string;
    total: number;
    completed: number;
    missed: number;
    noAnswer: number;
    voicemail: number;
  }>();

  for (const log of callLogs) {
    const callerId = log.assignedTo;
    const callerName = log.assignee?.user?.name || 'Unknown';

    if (!callerMap.has(callerId)) {
      callerMap.set(callerId, { name: callerName, total: 0, completed: 0, missed: 0, noAnswer: 0, voicemail: 0 });
    }

    const caller = callerMap.get(callerId)!;
    caller.total++;
    if (log.status === 'completed') caller.completed++;
    else if (log.status === 'missed') caller.missed++;
    else if (log.status === 'no_answer') caller.noAnswer++;
    else if (log.status === 'voicemail') caller.voicemail++;
  }

  const callers = Array.from(callerMap.entries())
    .map(([, data]) => ({
      name: data.name,
      totalCalls: data.total,
      completed: data.completed,
      missed: data.missed,
      noAnswer: data.noAnswer,
      voicemail: data.voicemail,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls)
    .slice(0, limit);

  return {
    count: callers.length,
    totalCallsInRange: callLogs.length,
    callers,
  };
};

/**
 * Get call volume trends by day for a date range
 */
export const getCallTrends = async (
  filters: {
    dateFrom: string;
    dateTo: string;
  },
  workspaceId: string
): Promise<any> => {
  const from = new Date(filters.dateFrom);
  const to = new Date(filters.dateTo);
  // Extend 'to' to end of that day
  to.setHours(23, 59, 59, 999);

  const callLogs = await prisma.callLog.findMany({
    where: {
      workspaceId,
      callDate: { gte: from, lte: to },
    },
    select: {
      callDate: true,
      status: true,
    },
    orderBy: { callDate: 'asc' },
  });

  // Bucket by date key (YYYY-MM-DD)
  const buckets = new Map<string, { total: number; completed: number; missed: number; noAnswer: number }>();
  for (const log of callLogs) {
    const dateKey = log.callDate.toISOString().split('T')[0];
    if (!buckets.has(dateKey)) {
      buckets.set(dateKey, { total: 0, completed: 0, missed: 0, noAnswer: 0 });
    }
    const b = buckets.get(dateKey)!;
    b.total++;
    if (log.status === 'completed') b.completed++;
    else if (log.status === 'missed') b.missed++;
    else if (log.status === 'no_answer') b.noAnswer++;
  }

  // Build array covering every day in the range (fill gaps with 0)
  const trends: Array<{ date: string; total: number; completed: number; missed: number; noAnswer: number }> = [];
  const current = new Date(filters.dateFrom);
  current.setHours(0, 0, 0, 0);
  const end = new Date(filters.dateTo);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    const b = buckets.get(dateKey) || { total: 0, completed: 0, missed: 0, noAnswer: 0 };
    trends.push({ date: dateKey, ...b });
    current.setDate(current.getDate() + 1);
  }

  const totalCalls = callLogs.length;
  const peakDay = trends.reduce((max, t) => (t.total > max.total ? t : max), trends[0] || { date: '', total: 0, completed: 0, missed: 0, noAnswer: 0 });

  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    totalCalls,
    days: trends.length,
    peakDay: peakDay.total > 0 ? { date: peakDay.date, total: peakDay.total } : null,
    trends,
  };
};

/**
 * Get call lists with filters
 */
export const getCallLists = async (
  filters: {
    status?: string;
    groupId?: string;
    limit?: number;
  },
  workspaceId: string
): Promise<any> => {
  const where: any = { workspaceId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.groupId) {
    where.groupId = filters.groupId;
  }

  const limit = filters.limit || 20;

  const callLists = await prisma.callList.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return {
    count: callLists.length,
    callLists: callLists.map(list => ({
      id: list.id,
      name: list.name,
      groupName: list.group?.name,
      status: list.status,
      itemCount: list._count.items,
    })),
  };
};

/**
 * Create a call list from the AI (Brain) interface
 */
export const createCallListForAI = async (
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    groupId: string;
    studentIds: string[];
    description?: string;
  }
): Promise<any> => {
  const callListService = await import('../call-lists/call-list.service');
  const result = await callListService.createCallList(workspaceId, userId, {
    name: data.name,
    groupId: data.groupId,
    studentIds: data.studentIds,
    source: 'FILTER',
    description: data.description,
    skipDuplicates: true,
    matchBy: 'email_or_phone',
  } as any);
  return {
    id: result.id,
    name: result.name,
    groupName: (result as any).group?.name,
    studentCount: (result as any).items?.length ?? data.studentIds.length,
    status: result.status,
  };
};

