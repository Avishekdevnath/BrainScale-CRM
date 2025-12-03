import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateModuleInput, UpdateModuleInput } from './module.schemas';

/**
 * Create a new module
 */
export const createModule = async (
  workspaceId: string,
  userId: string,
  data: CreateModuleInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can create modules');
  }

  // Verify course belongs to workspace
  const course = await prisma.course.findFirst({
    where: {
      id: data.courseId,
      workspaceId,
    },
  });

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  // Check if module name already exists in course
  const existing = await prisma.module.findUnique({
    where: {
      courseId_name: {
        courseId: data.courseId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'A module with this name already exists in this course');
  }

  const module = await prisma.module.create({
    data: {
      courseId: data.courseId,
      name: data.name,
      description: data.description,
      orderIndex: data.orderIndex || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          progress: true,
        },
      },
    },
  });

  return module;
};

/**
 * List all modules for a course
 */
export const listCourseModules = async (courseId: string, workspaceId: string) => {
  // Verify course belongs to workspace
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      workspaceId,
    },
  });

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  const modules = await prisma.module.findMany({
    where: { courseId },
    include: {
      _count: {
        select: {
          enrollments: true,
          progress: true,
        },
      },
    },
    orderBy: { orderIndex: 'asc' },
  });

  return modules;
};

/**
 * Get module details
 */
export const getModule = async (moduleId: string, workspaceId: string) => {
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      course: {
        workspaceId,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          progress: true,
        },
      },
    },
  });

  if (!module) {
    throw new AppError(404, 'Module not found');
  }

  return module;
};

/**
 * Update a module
 */
export const updateModule = async (
  moduleId: string,
  workspaceId: string,
  userId: string,
  data: UpdateModuleInput
) => {
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      course: {
        workspaceId,
      },
    },
  });

  if (!module) {
    throw new AppError(404, 'Module not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can update modules');
  }

  // Check name uniqueness if being updated
  if (data.name && data.name !== module.name) {
    const existing = await prisma.module.findUnique({
      where: {
        courseId_name: {
          courseId: module.courseId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'A module with this name already exists in this course');
    }
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: {
      name: data.name,
      description: data.description === null ? null : data.description,
      orderIndex: data.orderIndex,
      isActive: data.isActive,
    },
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          progress: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Delete a module
 */
export const deleteModule = async (moduleId: string, workspaceId: string, userId: string) => {
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      course: {
        workspaceId,
      },
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          progress: true,
        },
      },
    },
  });

  if (!module) {
    throw new AppError(404, 'Module not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can delete modules');
  }

  // Check if module has associated data
  if (module._count.enrollments > 0 || module._count.progress > 0) {
    // Soft delete by deactivating
    await prisma.module.update({
      where: { id: moduleId },
      data: { isActive: false },
    });
    return { message: 'Module deactivated (has associated enrollments or progress)' };
  }

  // Hard delete if no data
  await prisma.module.delete({
    where: { id: moduleId },
  });

  return { message: 'Module deleted successfully' };
};

