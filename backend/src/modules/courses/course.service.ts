import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateCourseInput, UpdateCourseInput } from './course.schemas';

/**
 * Create a new course
 */
export const createCourse = async (
  workspaceId: string,
  userId: string,
  data: CreateCourseInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can create courses');
  }

  // Check if course name already exists in workspace
  const existing = await prisma.course.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'A course with this name already exists');
  }

  const course = await prisma.course.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
  });

  return course;
};

/**
 * List all courses for a workspace
 */
export const listCourses = async (workspaceId: string) => {
  const courses = await prisma.course.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return courses;
};

/**
 * Get course details
 */
export const getCourse = async (courseId: string, workspaceId: string) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      workspaceId,
    },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: {
              enrollments: true,
              progress: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  return course;
};

/**
 * Update a course
 */
export const updateCourse = async (
  courseId: string,
  workspaceId: string,
  userId: string,
  data: UpdateCourseInput
) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      workspaceId,
    },
  });

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can update courses');
  }

  // Check name uniqueness if being updated
  if (data.name && data.name !== course.name) {
    const existing = await prisma.course.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'A course with this name already exists');
    }
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      name: data.name,
      description: data.description === null ? null : data.description,
      isActive: data.isActive,
    },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId: string, workspaceId: string, userId: string) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      workspaceId,
    },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    throw new AppError(404, 'Course not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can delete courses');
  }

  // Check if course has associated data
  if (course._count.modules > 0 || course._count.enrollments > 0) {
    // Soft delete by deactivating
    await prisma.course.update({
      where: { id: courseId },
      data: { isActive: false },
    });
    return { message: 'Course deactivated (has associated modules or enrollments)' };
  }

  // Hard delete if no data
  await prisma.course.delete({
    where: { id: courseId },
  });

  return { message: 'Course deleted successfully' };
};

