import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateGroupInput, UpdateGroupInput, AlignGroupsToBatchInput, ListGroupsInput } from './group.schemas';

/**
 * Create a new group
 * All workspace members can create groups
 */
export const createGroup = async (
  workspaceId: string,
  userId: string,
  data: CreateGroupInput
) => {
  // Verify user is a workspace member
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'You must be a workspace member to create groups');
  }

  // Check if group name already exists in workspace
  const existing = await prisma.group.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'A group with this name already exists');
  }

  // Validate batchId if provided
  if (data.batchId) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: data.batchId,
        workspaceId,
      },
    });

    if (!batch) {
      throw new AppError(404, 'Batch not found');
    }
  }

  const group = await prisma.group.create({
    data: {
      workspaceId,
      name: data.name,
      batchId: data.batchId || undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  return group;
};

/**
 * List all groups for a workspace
 * All workspace members can see all groups
 */
export const listGroups = async (workspaceId: string, userId: string, options?: ListGroupsInput) => {
  // Verify user is a workspace member
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // All members see all workspace groups
  const where: any = {
    workspaceId,
  };

  // Filter by batchId if provided
  if (options?.batchId) {
    where.batchId = options.batchId;
  }

  // Filter by isActive if provided
  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  const groups = await prisma.group.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return groups;
};

/**
 * Get group details
 * All workspace members can access any group in their workspace
 */
export const getGroup = async (groupId: string, workspaceId: string, userId: string) => {
  // Verify user is a workspace member
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Verify group exists in workspace
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      workspaceId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
          callLists: true,
        },
      },
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  return group;
};

/**
 * Update a group
 */
export const updateGroup = async (
  groupId: string,
  workspaceId: string,
  userId: string,
  data: UpdateGroupInput
) => {
  // Verify group exists and user has access
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      workspaceId,
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can update groups');
  }

  // Check name uniqueness if being updated
  if (data.name && data.name !== group.name) {
    const existing = await prisma.group.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'A group with this name already exists');
    }
  }

  // Validate batchId if provided
  if (data.batchId !== undefined) {
    if (data.batchId !== null) {
      const batch = await prisma.batch.findFirst({
        where: {
          id: data.batchId,
          workspaceId,
        },
      });

      if (!batch) {
        throw new AppError(404, 'Batch not found');
      }
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.batchId !== undefined) updateData.batchId = data.batchId;

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: updateData,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Delete a group
 */
export const deleteGroup = async (groupId: string, workspaceId: string, userId: string) => {
  // Verify group exists
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      workspaceId,
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          statuses: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  // Only admins can delete groups
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (membership?.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can delete groups');
  }

  // Check if group has associated data
  const hasData =
    (group._count?.enrollments ?? 0) > 0 ||
    (group._count?.calls ?? 0) > 0 ||
    (group._count?.followups ?? 0) > 0;

  if (hasData) {
    // Soft delete by deactivating
    await prisma.group.update({
      where: { id: groupId },
      data: { isActive: false },
    });
    return { message: 'Group deactivated (has associated data)' };
  }

  // Hard delete if no data
  await prisma.group.delete({
    where: { id: groupId },
  });

  return { message: 'Group deleted successfully' };
};

/**
 * Align multiple groups to a batch (bulk operation)
 */
export const alignGroupsToBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string,
  data: AlignGroupsToBatchInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can align groups to batches');
  }

  // Verify batch exists and belongs to workspace
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify all groups exist and belong to workspace
  const groups = await prisma.group.findMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
    },
  });

  if (groups.length !== data.groupIds.length) {
    throw new AppError(400, 'One or more groups not found');
  }

  // Update all groups to align with batch
  const result = await prisma.group.updateMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
    },
    data: {
      batchId,
    },
  });

  // Get updated groups with batch info
  const updatedGroups = await prisma.group.findMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  return {
    updated: result.count,
    groups: updatedGroups,
  };
};

/**
 * Remove groups from batch (set batchId to null)
 */
export const removeGroupsFromBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string,
  data: AlignGroupsToBatchInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can remove groups from batches');
  }

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

  // Verify all groups exist, belong to workspace, and are currently in this batch
  const groups = await prisma.group.findMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
      batchId,
    },
  });

  if (groups.length !== data.groupIds.length) {
    throw new AppError(400, 'One or more groups not found or not aligned to this batch');
  }

  // Remove batch alignment (set batchId to null)
  const result = await prisma.group.updateMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
      batchId,
    },
    data: {
      batchId: null,
    },
  });

  // Get updated groups
  const updatedGroups = await prisma.group.findMany({
    where: {
      id: { in: data.groupIds },
      workspaceId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  return {
    removed: result.count,
    groups: updatedGroups,
  };
};

/**
 * Get all groups for a specific batch
 * All workspace members can see all groups in a batch
 */
export const getGroupsByBatch = async (
  batchId: string,
  workspaceId: string,
  userId: string
) => {
  // Verify user is a workspace member
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

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

  // All members see all groups in the batch
  const groups = await prisma.group.findMany({
    where: {
      workspaceId,
      batchId,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          calls: true,
          followups: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return groups;
};

