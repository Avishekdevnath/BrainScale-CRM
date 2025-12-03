import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import {
  CreateBatchInput,
  UpdateBatchInput,
  ListBatchesInput,
} from './batch.schemas';

/**
 * Create a new batch
 */
export const createBatch = async (
  workspaceId: string,
  userId: string,
  data: CreateBatchInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can create batches');
  }

  // Check if batch name already exists in workspace
  const existing = await prisma.batch.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'A batch with this name already exists');
  }

  // Parse dates if provided
  const startDate = data.startDate ? new Date(data.startDate) : null;
  const endDate = data.endDate ? new Date(data.endDate) : null;

  const batch = await prisma.batch.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      _count: {
        select: {
          groups: true,
          studentBatches: true,
        },
      },
    },
  });

  return batch;
};

/**
 * List all batches for a workspace
 */
export const listBatches = async (
  workspaceId: string,
  userId: string,
  options: ListBatchesInput
) => {
  // Verify user membership
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Build where clause
  const where: any = {
    workspaceId,
  };

  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  // Calculate pagination
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Get batches with pagination
  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: {
        _count: {
          select: {
            groups: true,
            studentBatches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.batch.count({ where }),
  ]);

  return {
    batches,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

/**
 * Get batch details
 */
export const getBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify batch exists in workspace
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
    include: {
      _count: {
        select: {
          groups: true,
          studentBatches: true,
        },
      },
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user membership (all members can view)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  return batch;
};

/**
 * Update a batch
 */
export const updateBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string,
  data: UpdateBatchInput
) => {
  // Verify batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can update batches');
  }

  // Check name uniqueness if being updated
  if (data.name && data.name !== batch.name) {
    const existing = await prisma.batch.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'A batch with this name already exists');
    }
  }

  // Parse dates if provided
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate !== undefined) {
    updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: updateData,
    include: {
      _count: {
        select: {
          groups: true,
          studentBatches: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Delete a batch
 */
export const deleteBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
    include: {
      _count: {
        select: {
          groups: true,
          studentBatches: true,
        },
      },
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can delete batches');
  }

  // Check if batch has associated data
  const hasData =
    (batch._count?.groups ?? 0) > 0 || (batch._count?.studentBatches ?? 0) > 0;

  if (hasData) {
    // Soft delete by deactivating
    await prisma.batch.update({
      where: { id: batchId },
      data: { isActive: false },
    });
    return { message: 'Batch deactivated (has associated data)' };
  }

  // Hard delete if no data (cascade will remove StudentBatch records)
  await prisma.batch.delete({
    where: { id: batchId },
  });

  return { message: 'Batch deleted successfully' };
};

/**
 * Get batch statistics
 */
export const getBatchStats = async (
  batchId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify batch exists and user has access
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user membership
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Get counts
  const [
    groupsCount,
    studentsCount,
    enrollmentsCount,
    callsCount,
    followupsCount,
  ] = await Promise.all([
    prisma.group.count({
      where: {
        batchId,
        workspaceId,
      },
    }),
    prisma.studentBatch.count({
      where: {
        batchId,
      },
    }),
    prisma.enrollment.count({
      where: {
        group: {
          batchId,
        },
      },
    }),
    prisma.call.count({
      where: {
        group: {
          batchId,
        },
      },
    }),
    prisma.followup.count({
      where: {
        group: {
          batchId,
        },
      },
    }),
  ]);

  return {
    batch: {
      id: batch.id,
      name: batch.name,
    },
    counts: {
      groups: groupsCount,
      students: studentsCount,
      enrollments: enrollmentsCount,
      calls: callsCount,
      followups: followupsCount,
    },
  };
};

