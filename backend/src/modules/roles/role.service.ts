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

  console.log(`[listPermissions service] Found ${permissions.length} permissions in database`);
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
    
    // Modules
    { resource: 'modules', action: 'create', description: 'Create modules' },
    { resource: 'modules', action: 'read', description: 'View modules' },
    { resource: 'modules', action: 'update', description: 'Update modules' },
    { resource: 'modules', action: 'delete', description: 'Delete modules' },
    { resource: 'modules', action: 'manage', description: 'Full access to modules' },
    
    // Enrollments
    { resource: 'enrollments', action: 'create', description: 'Create enrollments' },
    { resource: 'enrollments', action: 'read', description: 'View enrollments' },
    { resource: 'enrollments', action: 'update', description: 'Update enrollments' },
    { resource: 'enrollments', action: 'delete', description: 'Delete enrollments' },
    { resource: 'enrollments', action: 'manage', description: 'Full access to enrollments' },
    
    // Call Lists
    { resource: 'call_lists', action: 'create', description: 'Create call lists' },
    { resource: 'call_lists', action: 'read', description: 'View call lists' },
    { resource: 'call_lists', action: 'update', description: 'Update call lists' },
    { resource: 'call_lists', action: 'delete', description: 'Delete call lists' },
    { resource: 'call_lists', action: 'manage', description: 'Full access to call lists' },
    
    // Batches
    { resource: 'batches', action: 'create', description: 'Create batches' },
    { resource: 'batches', action: 'read', description: 'View batches' },
    { resource: 'batches', action: 'update', description: 'Update batches' },
    { resource: 'batches', action: 'delete', description: 'Delete batches' },
    { resource: 'batches', action: 'manage', description: 'Full access to batches' },
    
    // Roles (Custom Roles)
    { resource: 'roles', action: 'create', description: 'Create custom roles' },
    { resource: 'roles', action: 'read', description: 'View custom roles' },
    { resource: 'roles', action: 'update', description: 'Update custom roles' },
    { resource: 'roles', action: 'delete', description: 'Delete custom roles' },
    { resource: 'roles', action: 'manage', description: 'Full access to custom roles' },
    
    // Revenue
    { resource: 'revenue', action: 'create', description: 'Create revenue records' },
    { resource: 'revenue', action: 'read', description: 'View revenue records' },
    { resource: 'revenue', action: 'update', description: 'Update revenue records' },
    { resource: 'revenue', action: 'delete', description: 'Delete revenue records' },
    { resource: 'revenue', action: 'manage', description: 'Full access to revenue' },
    
    // Imports
    { resource: 'imports', action: 'create', description: 'Create imports' },
    { resource: 'imports', action: 'read', description: 'View imports' },
    { resource: 'imports', action: 'manage', description: 'Full access to imports' },
    
    // Exports
    { resource: 'exports', action: 'create', description: 'Create exports' },
    { resource: 'exports', action: 'read', description: 'View exports' },
    { resource: 'exports', action: 'manage', description: 'Full access to exports' },
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

/**
 * Create Admin and Member custom roles with all permissions for a workspace
 * This is useful for setting up default roles with full access
 */
export const createDefaultRolesWithAllPermissions = async (workspaceId: string) => {
  // Get all available permissions
  const allPermissions = await prisma.permission.findMany({
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' },
    ],
  });

  if (allPermissions.length === 0) {
    throw new AppError(400, 'No permissions found. Please initialize permissions first.');
  }

  const permissionIds = allPermissions.map((p) => p.id);

  // Check if roles already exist
  const existingAdmin = await prisma.customRole.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: 'Admin',
      },
    },
  });

  const existingMember = await prisma.customRole.findUnique({
    where: {
      workspaceId_name: {
        workspaceId,
        name: 'Member',
      },
    },
  });

  const results: { admin?: any; member?: any } = {};

  // Create Admin role with all permissions
  if (!existingAdmin) {
    const adminRole = await prisma.customRole.create({
      data: {
        workspaceId,
        name: 'Admin',
        description: 'Full administrative access to all features',
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
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
    results.admin = adminRole;
  } else {
    // Update existing Admin role to have all permissions
    // Get existing permissions first
    const existingAdminPermissions = await prisma.rolePermission.findMany({
      where: {
        customRoleId: existingAdmin.id,
      },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(existingAdminPermissions.map((p) => p.permissionId));
    
    // Delete permissions that shouldn't exist
    const permissionsToRemove = existingAdminPermissions
      .filter((p) => !permissionIds.includes(p.permissionId))
      .map((p) => p.permissionId);
    
    if (permissionsToRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          customRoleId: existingAdmin.id,
          permissionId: { in: permissionsToRemove },
        },
      });
    }

    // Only create permissions that don't already exist
    const permissionsToAdd = permissionIds.filter((id) => !existingPermissionIds.has(id));
    
    for (const permissionId of permissionsToAdd) {
      await prisma.rolePermission.create({
        data: {
          customRoleId: existingAdmin.id,
          permissionId,
        },
      });
    }

    const adminRole = await prisma.customRole.findUnique({
      where: { id: existingAdmin.id },
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
    results.admin = adminRole;
  }

  // Create Member role with all permissions
  if (!existingMember) {
    const memberRole = await prisma.customRole.create({
      data: {
        workspaceId,
        name: 'Member',
        description: 'Full access to all features',
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
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
    results.member = memberRole;
  } else {
    // Update existing Member role to have all permissions
    // Get existing permissions first
    const existingMemberPermissions = await prisma.rolePermission.findMany({
      where: {
        customRoleId: existingMember.id,
      },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(existingMemberPermissions.map((p) => p.permissionId));
    
    // Delete permissions that shouldn't exist
    const permissionsToRemove = existingMemberPermissions
      .filter((p) => !permissionIds.includes(p.permissionId))
      .map((p) => p.permissionId);
    
    if (permissionsToRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          customRoleId: existingMember.id,
          permissionId: { in: permissionsToRemove },
        },
      });
    }

    // Only create permissions that don't already exist
    const permissionsToAdd = permissionIds.filter((id) => !existingPermissionIds.has(id));
    
    for (const permissionId of permissionsToAdd) {
      await prisma.rolePermission.create({
        data: {
          customRoleId: existingMember.id,
          permissionId,
        },
      });
    }

    const memberRole = await prisma.customRole.findUnique({
      where: { id: existingMember.id },
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
    results.member = memberRole;
  }

  return {
    message: 'Default roles created/updated successfully',
    admin: results.admin,
    member: results.member,
    permissionsGranted: allPermissions.length,
  };
};

