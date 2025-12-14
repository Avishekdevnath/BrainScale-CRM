import { prisma } from '../../db/client';
import { AppError } from '../../middleware/error-handler';
import { hashPassword } from '../../auth/password';
import { sendTemporaryPasswordEmail } from '../../utils/email';
import { signAccessToken, signRefreshToken } from '../../auth/jwt';
import crypto from 'crypto';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberInput,
  GrantGroupAccessInput,
  CreateMemberWithAccountInput,
} from './workspace.schemas';

export const createWorkspace = async (userId: string, data: CreateWorkspaceInput) => {
  // Check user's plan - Free plan can only have 1 workspace
  const existingMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
  });

  // Check if user already has a workspace with FREE plan
  const hasFreePlanWorkspace = existingMemberships.some(
    (m) => m.workspace.plan === 'FREE'
  );

  if (hasFreePlanWorkspace && existingMemberships.length >= 1) {
    throw new AppError(
      403,
      'Free plan allows only 1 workspace. Please upgrade to create more workspaces.'
    );
  }

  // Create workspace and add user as admin
  const workspace = await prisma.workspace.create({
    data: {
      ...data,
      members: {
        create: {
          userId,
          role: 'ADMIN',
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Generate new access token with the new workspace ID
  // This ensures the user's JWT token has the correct workspaceId for subsequent requests
  const accessToken = signAccessToken({
    sub: userId,
    workspaceId: workspace.id,
    role: 'ADMIN',
  });

  const refreshToken = signRefreshToken(userId);

  // Return workspace with new tokens
  // Include tokens so frontend can update the JWT with correct workspaceId
  return {
    id: workspace.id,
    name: workspace.name,
    logo: workspace.logo,
    plan: workspace.plan,
    timezone: workspace.timezone,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    members: workspace.members,
    accessToken,
    refreshToken,
  } as typeof workspace & { accessToken: string; refreshToken: string };
};

export const getWorkspaces = async (userId: string) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: true,
              groups: true,
              students: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    logo: m.workspace.logo,
    plan: m.workspace.plan,
    timezone: m.workspace.timezone,
    role: m.role,
    memberCount: m.workspace._count.members,
    groupCount: m.workspace._count.groups,
    studentCount: m.workspace._count.students,
    createdAt: m.workspace.createdAt,
  }));
};

export const getWorkspace = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          groupAccess: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          groups: true,
          courses: true,
          students: true,
          calls: true,
          followups: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Check if user is a member
  const membership = workspace.members.find((m) => m.userId === userId);
  if (!membership) {
    throw new AppError(403, 'Access denied to this workspace');
  }

  return workspace;
};

export const updateWorkspace = async (
  workspaceId: string,
  data: UpdateWorkspaceInput
) => {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });

  return workspace;
};

export const inviteMember = async (
  workspaceId: string,
  data: InviteMemberInput
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError(404, 'User with this email not found. They need to signup first.');
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (existingMember) {
    throw new AppError(409, 'User is already a member of this workspace');
  }

  // Create membership
  const member = await prisma.workspaceMember.create({
    data: {
      userId: user.id,
      workspaceId,
      role: data.role,
      groupAccess: data.groupIds
        ? {
            create: data.groupIds.map((groupId) => ({
              groupId,
            })),
          }
        : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      groupAccess: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return member;
};

export const getMembers = async (workspaceId: string) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      groupAccess: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return members;
};

export const updateMember = async (
  memberId: string,
  data: UpdateMemberInput
) => {
  // Get current member to check workspace
  const currentMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { workspaceId: true },
  });

  if (!currentMember) {
    throw new AppError(404, 'Member not found');
  }

  // Validate custom role if provided
  if (data.customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: {
        id: data.customRoleId,
        workspaceId: currentMember.workspaceId,
      },
    });

    if (!customRole) {
      throw new AppError(404, 'Custom role not found or does not belong to this workspace');
    }
  }

  // Prepare update data
  const updateData: any = {};
  
  if (data.role) {
    updateData.role = data.role;
    updateData.customRoleId = null; // Clear custom role when setting legacy role
  } else if (data.customRoleId) {
    updateData.customRoleId = data.customRoleId;
    // Keep existing role for backward compatibility, but customRole takes precedence
  }

  const member = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      customRole: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      groupAccess: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return member;
};

export const grantGroupAccess = async (
  memberId: string,
  data: GrantGroupAccessInput
) => {
  // Remove existing group access
  await prisma.groupAccess.deleteMany({
    where: { memberId },
  });

  // Create new group access
  const groupAccess = await prisma.groupAccess.createMany({
    data: data.groupIds.map((groupId) => ({
      memberId,
      groupId,
    })),
  });

  return { granted: groupAccess.count };
};

export const removeMember = async (memberId: string) => {
  // Delete member (cascade will remove group access)
  await prisma.workspaceMember.delete({
    where: { id: memberId },
  });

  return { message: 'Member removed successfully' };
};

/**
 * Generate a secure random temporary password
 */
const generateTemporaryPassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one character from each category
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export const createMemberWithAccount = async (
  workspaceId: string,
  data: CreateMemberWithAccountInput
) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  // Validate custom role if provided
  if (data.customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: {
        id: data.customRoleId,
        workspaceId,
      },
    });

    if (!customRole) {
      throw new AppError(404, 'Custom role not found or does not belong to this workspace');
    }
  }

  // Validate groups if provided
  if (data.groupIds && data.groupIds.length > 0) {
    const groups = await prisma.group.findMany({
      where: {
        id: { in: data.groupIds },
        workspaceId,
        isActive: true,
      },
    });

    if (groups.length !== data.groupIds.length) {
      throw new AppError(404, 'One or more groups not found or inactive');
    }
  }

  // Generate temporary password
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  // Create user with temporary password
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone,
      emailVerified: true, // Admin-created users are pre-verified
      mustChangePassword: true,
      temporaryPassword: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  // Create workspace membership with setup not completed
  const member = await prisma.workspaceMember.create({
    data: {
      userId: user.id,
      workspaceId,
      role: data.role || 'MEMBER',
      customRoleId: data.customRoleId,
      setupCompleted: false, // Member needs to complete setup
      agreementAccepted: false, // Agreement not yet accepted
      groupAccess: data.groupIds
        ? {
            create: data.groupIds.map((groupId) => ({
              groupId,
            })),
          }
        : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      groupAccess: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Get workspace name for email
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  // Send welcome email with temporary password
  try {
    await sendTemporaryPasswordEmail(
      user.email,
      user.name || 'User',
      workspace?.name || 'Workspace',
      temporaryPassword
    );
  } catch (error) {
    // Log error but don't fail the creation
    // The admin can manually share the password
    console.error('Failed to send temporary password email:', error);
  }

  return {
    member,
    temporaryPassword, // Return for admin to display/share
    message: 'Member account created successfully. Temporary password sent via email.',
  };
};

export const getCurrentMember = async (workspaceId: string, userId: string) => {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      customRole: {
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  resource: true,
                  action: true,
                  description: true,
                },
              },
            },
          },
        },
      },
      groupAccess: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  // Format permissions from custom role
  const permissions = member.customRole
    ? member.customRole.permissions.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      }))
    : [];

  return {
    id: member.id,
    userId: member.userId,
    workspaceId: member.workspaceId,
    role: member.role,
    customRole: member.customRole
      ? {
          id: member.customRole.id,
          name: member.customRole.name,
          description: member.customRole.description,
        }
      : null,
    permissions,
    groupAccess: member.groupAccess.map((ga) => ({
      id: ga.id,
      group: ga.group,
    })),
    user: member.user,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
};

