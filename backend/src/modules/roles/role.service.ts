import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { CreateRoleInput, UpdateRoleInput, AssignPermissionsInput } from './role.schemas';

/**
 * Create a custom role for a workspace
 */
export const createRole = async (workspaceId: string, data: CreateRoleInput) => {
  // Check if role name already exists in workspace
  const existingRole = await prisma.customRole.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: data.name,
      },
    },
  });

  if (existingRole) {
    throw new AppError(409, 'A role with this name already exists');
  }

  const role = await prisma.customRole.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return role;
};

/**
 * List all custom roles for a workspace
 */
export const listRoles = async (workspaceId: string) => {
  const roles = await prisma.customRole.findMany({
    where: { workspaceId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return roles;
};

/**
 * Get role by ID
 */
export const getRole = async (roleId: string, workspaceId: string) => {
  const role = await prisma.customRole.findFirst({
    where: {
      id: roleId,
      workspaceId,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError(404, 'Role not found');
  }

  return role;
};

/**
 * Update a custom role
 */
export const updateRole = async (
  roleId: string,
  workspaceId: string,
  data: UpdateRoleInput
) => {
  const role = await prisma.customRole.findFirst({
    where: {
      id: roleId,
      workspaceId,
      isSystem: false, // Can't update system roles
    },
  });

  if (!role) {
    throw new AppError(404, 'Role not found or cannot be updated');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== role.name) {
    const existingRole = await prisma.customRole.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existingRole) {
      throw new AppError(409, 'A role with this name already exists');
    }
  }

  const updatedRole = await prisma.customRole.update({
    where: { id: roleId },
    data: {
      name: data.name,
      description: data.description,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return updatedRole;
};

/**
 * Delete a custom role
 */
export const deleteRole = async (roleId: string, workspaceId: string) => {
  const role = await prisma.customRole.findFirst({
    where: {
      id: roleId,
      workspaceId,
      isSystem: false, // Can't delete system roles
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError(404, 'Role not found or cannot be deleted');
  }

  if (role._count.members > 0) {
    throw new AppError(400, 'Cannot delete role that is assigned to members');
  }

  await prisma.customRole.delete({
    where: { id: roleId },
  });

  return { message: 'Role deleted successfully' };
};

/**
 * Assign permissions to a role
 */
export const assignPermissions = async (
  roleId: string,
  workspaceId: string,
  data: AssignPermissionsInput
) => {
  // Verify role exists and belongs to workspace
  const role = await prisma.customRole.findFirst({
    where: {
      id: roleId,
      workspaceId,
    },
  });

  if (!role) {
    throw new AppError(404, 'Role not found');
  }

  // Verify all permissions exist
  const permissions = await prisma.permission.findMany({
    where: {
      id: { in: data.permissionIds },
    },
  });

  if (permissions.length !== data.permissionIds.length) {
    throw new AppError(400, 'One or more permissions not found');
  }

  // Remove existing permissions
  await prisma.rolePermission.deleteMany({
    where: { customRoleId: roleId },
  });

  // Add new permissions (MongoDB doesn't support skipDuplicates, so we create individually)
  for (const permissionId of data.permissionIds) {
    try {
      await prisma.rolePermission.create({
        data: {
          customRoleId: roleId,
          permissionId,
        },
      });
    } catch (error) {
      // Ignore duplicate errors (unique constraint violation)
      // MongoDB will throw if the combination already exists
    }
  }

  // Return updated role with permissions
  return await getRole(roleId, workspaceId);
};

/**
 * List all available permissions
 */
export const listPermissions = async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });

  return permissions;
};

/**
 * Initialize default permissions (call this in seed or migration)
 */
export const initializeDefaultPermissions = async () => {
  const defaultPermissions = [
    // Students
    { resource: 'students', action: 'create', description: 'Create students' },
    { resource: 'students', action: 'read', description: 'View students' },
    { resource: 'students', action: 'update', description: 'Update students' },
    { resource: 'students', action: 'delete', description: 'Delete students' },
    { resource: 'students', action: 'manage', description: 'Full access to students' },
    
    // Calls
    { resource: 'calls', action: 'create', description: 'Create calls' },
    { resource: 'calls', action: 'read', description: 'View calls' },
    { resource: 'calls', action: 'update', description: 'Update calls' },
    { resource: 'calls', action: 'delete', description: 'Delete calls' },
    { resource: 'calls', action: 'manage', description: 'Full access to calls' },
    
    // Follow-ups
    { resource: 'followups', action: 'create', description: 'Create follow-ups' },
    { resource: 'followups', action: 'read', description: 'View follow-ups' },
    { resource: 'followups', action: 'update', description: 'Update follow-ups' },
    { resource: 'followups', action: 'delete', description: 'Delete follow-ups' },
    { resource: 'followups', action: 'manage', description: 'Full access to follow-ups' },
    
    // Workspace
    { resource: 'workspace', action: 'read', description: 'View workspace settings' },
    { resource: 'workspace', action: 'update', description: 'Update workspace settings' },
    { resource: 'workspace', action: 'manage', description: 'Full workspace management' },
    
    // Members
    { resource: 'members', action: 'invite', description: 'Invite members' },
    { resource: 'members', action: 'read', description: 'View members' },
    { resource: 'members', action: 'update', description: 'Update member roles' },
    { resource: 'members', action: 'remove', description: 'Remove members' },
    { resource: 'members', action: 'manage', description: 'Full member management' },
    
    // Groups
    { resource: 'groups', action: 'create', description: 'Create groups' },
    { resource: 'groups', action: 'read', description: 'View groups' },
    { resource: 'groups', action: 'update', description: 'Update groups' },
    { resource: 'groups', action: 'delete', description: 'Delete groups' },
    { resource: 'groups', action: 'manage', description: 'Full access to groups' },
    
    // Courses
    { resource: 'courses', action: 'create', description: 'Create courses' },
    { resource: 'courses', action: 'read', description: 'View courses' },
    { resource: 'courses', action: 'update', description: 'Update courses' },
    { resource: 'courses', action: 'delete', description: 'Delete courses' },
    { resource: 'courses', action: 'manage', description: 'Full access to courses' },
  ];

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  return { message: 'Default permissions initialized' };
};

