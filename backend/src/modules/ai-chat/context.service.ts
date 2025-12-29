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
    },
    orderBy: { name: 'asc' },
  });

  return {
    count: students.length,
    students: students,
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
    const kpis = await dashboardService.getKPIs(workspaceId);
    return {
      overview: kpis.overview,
      activity: kpis.activity,
      followups: kpis.followups,
      metrics: kpis.metrics,
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

