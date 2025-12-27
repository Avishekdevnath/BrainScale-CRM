import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import * as dashboardService from '../dashboard/dashboard.service';

/**
 * Get student information by name
 */
export const getStudentInfo = async (
  studentName: string,
  workspaceId: string
): Promise<any> => {
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
  },
  workspaceId: string
): Promise<any> => {
  const where: any = { workspaceId };

  if (filters.studentId) {
    where.studentId = filters.studentId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.callDate = {};
    if (filters.dateFrom) {
      where.callDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.callDate.lte = new Date(filters.dateTo);
    }
  }

  const limit = filters.limit || 20;

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

  return {
    count: callLogs.length,
    callLogs: callLogs.map(log => ({
      id: log.id,
      studentName: log.student?.name,
      status: log.status,
      callDate: log.callDate,
      callerName: log.assignee?.user?.name,
      summaryNote: log.summaryNote,
      sentiment: log.sentiment,
    })),
  };
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

