import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import {
  CreateEnrollmentInput,
  UpdateEnrollmentInput,
  SetStudentStatusInput,
  UpdateModuleProgressInput,
} from './enrollment.schemas';

/**
 * Create enrollment (link student to group/course/module)
 */
export const createEnrollment = async (
  workspaceId: string,
  userId: string,
  data: CreateEnrollmentInput
) => {
  // Verify student belongs to workspace
  const student = await prisma.student.findFirst({
    where: {
      id: data.studentId,
      workspaceId,
      isDeleted: false,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Verify group belongs to workspace
  const group = await prisma.group.findFirst({
    where: {
      id: data.groupId,
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
        where: { groupId: data.groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
  }

  // Verify course if provided
  if (data.courseId) {
    const course = await prisma.course.findFirst({
      where: {
        id: data.courseId,
        workspaceId,
      },
    });

    if (!course) {
      throw new AppError(404, 'Course not found');
    }
  }

  // Verify module if provided
  if (data.moduleId) {
    const module = await prisma.module.findFirst({
      where: {
        id: data.moduleId,
        course: {
          workspaceId,
        },
      },
    });

    if (!module) {
      throw new AppError(404, 'Module not found');
    }

    // Module must belong to the course if courseId is provided
    if (data.courseId && module.courseId !== data.courseId) {
      throw new AppError(400, 'Module does not belong to the specified course');
    }
  }

  const enrollmentInclude = {
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
    course: {
      select: {
        id: true,
        name: true,
      },
    },
    module: {
      select: {
        id: true,
        name: true,
      },
    },
  } as const;

  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: data.studentId,
      groupId: data.groupId,
      courseId: data.courseId ?? null,
      moduleId: data.moduleId ?? null,
    },
  });

  let enrollment;
  if (existingEnrollment) {
    enrollment = await prisma.enrollment.update({
      where: { id: existingEnrollment.id },
      data: {
        isActive: true,
      },
      include: enrollmentInclude,
    });
  } else {
    enrollment = await prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        groupId: data.groupId,
        courseId: data.courseId ?? null,
        moduleId: data.moduleId ?? null,
        isActive: true,
      },
      include: enrollmentInclude,
    });
  }

  return enrollment;
};

/**
 * Update enrollment
 */
export const updateEnrollment = async (
  enrollmentId: string,
  workspaceId: string,
  userId: string,
  data: UpdateEnrollmentInput
) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      student: {
        workspaceId,
      },
    },
    include: {
      group: true,
    },
  });

  if (!enrollment) {
    throw new AppError(404, 'Enrollment not found');
  }

  // Verify user has access to the group
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: {
        where: { groupId: enrollment.groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      isActive: data.isActive,
    },
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
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      module: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Get student statuses per group
 */
export const getStudentStatuses = async (studentId: string, workspaceId: string) => {
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

  const statuses = await prisma.studentGroupStatus.findMany({
    where: {
      studentId,
      group: {
        workspaceId,
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return statuses;
};

/**
 * Set student status for a group
 */
export const setStudentStatus = async (
  studentId: string,
  workspaceId: string,
  userId: string,
  data: SetStudentStatusInput
) => {
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

  // Verify group belongs to workspace
  const group = await prisma.group.findFirst({
    where: {
      id: data.groupId,
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
        where: { groupId: data.groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
  }

  // Create or update status
  const status = await prisma.studentGroupStatus.upsert({
    where: {
      studentId_groupId: {
        studentId,
        groupId: data.groupId,
      },
    },
    update: {
      status: data.status,
    },
    create: {
      studentId,
      groupId: data.groupId,
      status: data.status,
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return status;
};

/**
 * Update module progress
 */
export const updateModuleProgress = async (
  workspaceId: string,
  userId: string,
  data: UpdateModuleProgressInput
) => {
  // Verify student belongs to workspace
  const student = await prisma.student.findFirst({
    where: {
      id: data.studentId,
      workspaceId,
      isDeleted: false,
    },
  });

  if (!student) {
    throw new AppError(404, 'Student not found');
  }

  // Verify module belongs to workspace
  const module = await prisma.module.findFirst({
    where: {
      id: data.moduleId,
      course: {
        workspaceId,
      },
    },
  });

  if (!module) {
    throw new AppError(404, 'Module not found');
  }

  // Create or update progress
  const progress = await prisma.moduleProgress.upsert({
    where: {
      studentId_moduleId: {
        studentId: data.studentId,
        moduleId: data.moduleId,
      },
    },
    update: {
      isCompleted: data.isCompleted !== undefined ? data.isCompleted : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
    create: {
      studentId: data.studentId,
      moduleId: data.moduleId,
      isCompleted: data.isCompleted || false,
      notes: data.notes || null,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
        },
      },
      module: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return progress;
};

