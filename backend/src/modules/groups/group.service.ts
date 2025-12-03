import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateGroupInput, UpdateGroupInput, AlignGroupsToBatchInput, ListGroupsInput } from './group.schemas';

/**
 * Create a new group
 */
export const createGroup = async (
  workspaceId: string,
  userId: string,
  data: CreateGroupInput
) => {
  // Verify user is admin
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership || membership.role !== 'ADMIN') {
    throw new AppError(403, 'Only admins can create groups');
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
 */
export const listGroups = async (workspaceId: string, userId: string, options?: ListGroupsInput) => {
  // Get user's membership and group access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Admins see all groups, members only see groups they have access to
  const where: any = {
    workspaceId,
  };

  if (membership.role !== 'ADMIN') {
    const accessibleGroupIds = membership.groupAccess.map((access) => access.groupId);
    where.id = { in: accessibleGroupIds };
  }

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
 */
export const getGroup = async (groupId: string, workspaceId: string, userId: string) => {
  // Verify group exists and user has access
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

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: {
        where: { groupId },
      },
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  if (membership.role !== 'ADMIN' && membership.groupAccess.length === 0) {
    throw new AppError(403, 'Access denied to this group');
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
 */
export const getGroupsByBatch = async (
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
  });

  if (!batch) {
    throw new AppError(404, 'Batch not found');
  }

  // Verify user has access
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: {
      groupAccess: true,
    },
  });

  if (!membership) {
    throw new AppError(403, 'Access denied');
  }

  // Build where clause
  const where: any = {
    workspaceId,
    batchId,
  };

  // Non-admins only see groups they have access to
  if (membership.role !== 'ADMIN') {
    const accessibleGroupIds = membership.groupAccess.map((access) => access.groupId);
    where.id = { in: accessibleGroupIds };
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

