import { prisma } from '../../db/client';
import { env } from '../../config/env';
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
  // Current constraint: one admin can have only one workspace.
  // Block creating another workspace if the user is already an ADMIN in any workspace.
  const existingAdminMembership = await prisma.workspaceMember.findFirst({
    where: { userId, role: 'ADMIN' },
    select: { id: true, workspaceId: true },
  });

  if (existingAdminMembership) {
    throw new AppError(
      400,
      'You can only have one workspace right now. Delete your existing workspace to create another.'
    );
  }

  // Plan enforcement is disabled unless BILLING_ENABLED=true.
  if (env.BILLING_ENABLED) {
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

export const deleteWorkspace = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Collect IDs for relation tables that don't have workspaceId.
  const [groups, batches, courses, students, customRoles] = await Promise.all([
    prisma.group.findMany({ where: { workspaceId }, select: { id: true } }),
    prisma.batch.findMany({ where: { workspaceId }, select: { id: true } }),
    prisma.course.findMany({ where: { workspaceId }, select: { id: true } }),
    prisma.student.findMany({ where: { workspaceId }, select: { id: true } }),
    prisma.customRole.findMany({ where: { workspaceId }, select: { id: true } }),
  ]);

  const groupIds = groups.map((g) => g.id);
  const batchIds = batches.map((b) => b.id);
  const courseIds = courses.map((c) => c.id);
  const studentIds = students.map((s) => s.id);
  const customRoleIds = customRoles.map((r) => r.id);

  const modules = courseIds.length
    ? await prisma.module.findMany({ where: { courseId: { in: courseIds } }, select: { id: true } })
    : [];
  const moduleIds = modules.map((m) => m.id);

  // Delete in a safe order (Mongo doesn't enforce FKs; this prevents leaving dependent docs around).
  if (groupIds.length) {
    await prisma.enrollment.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.studentGroupStatus.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.groupAccess.deleteMany({ where: { groupId: { in: groupIds } } });
  }

  if (studentIds.length) {
    await prisma.studentGroupStatus.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.moduleProgress.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.studentBatch.deleteMany({ where: { studentId: { in: studentIds } } });
  }

  if (batchIds.length) {
    await prisma.studentBatch.deleteMany({ where: { batchId: { in: batchIds } } });
  }

  if (moduleIds.length) {
    await prisma.moduleProgress.deleteMany({ where: { moduleId: { in: moduleIds } } });
  }

  if (courseIds.length) {
    await prisma.module.deleteMany({ where: { courseId: { in: courseIds } } });
  }

  if (customRoleIds.length) {
    await prisma.rolePermission.deleteMany({ where: { customRoleId: { in: customRoleIds } } });
  }

  // Workspace-scoped collections (delete sequentially to avoid occasional referential-action races)
  await prisma.chatMessage.deleteMany({ where: { workspaceId } });
  await prisma.chat.deleteMany({ where: { workspaceId } });

  // CallLog.assignedTo is required -> delete logs before deleting members
  await prisma.callLog.deleteMany({ where: { workspaceId } });
  await prisma.followup.deleteMany({ where: { workspaceId } });
  await prisma.callListItem.deleteMany({ where: { workspaceId } });
  await prisma.callList.deleteMany({ where: { workspaceId } });
  await prisma.call.deleteMany({ where: { workspaceId } });

  await prisma.payment.deleteMany({ where: { workspaceId } });
  await prisma.import.deleteMany({ where: { workspaceId } });
  await prisma.auditLog.deleteMany({ where: { workspaceId } });
  await prisma.invitation.deleteMany({ where: { workspaceId } });
  await prisma.studentPhone.deleteMany({ where: { workspaceId } });

  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.customRole.deleteMany({ where: { workspaceId } });
  await prisma.group.deleteMany({ where: { workspaceId } });
  await prisma.batch.deleteMany({ where: { workspaceId } });
  await prisma.course.deleteMany({ where: { workspaceId } });
  await prisma.student.deleteMany({ where: { workspaceId } });

  await prisma.workspace.delete({ where: { id: workspaceId } });

  return { message: 'Workspace deleted' };
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
  // Check if workspace exists
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!existingWorkspace) {
    throw new AppError(404, 'Workspace not found');
  }

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
  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: true,
    },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Plan enforcement is disabled unless BILLING_ENABLED=true.
  // Check member limit for FREE plan
  if (env.BILLING_ENABLED && workspace.plan === 'FREE') {
    const currentMemberCount = workspace.members.length;
    if (currentMemberCount >= 5) {
      throw new AppError(
        403,
        'Free plan allows a maximum of 5 members. Please upgrade to add more members.'
      );
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
      throw new AppError(400, 'One or more groups not found or inactive');
    }
  }

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
  // Get current member to check workspace and role
  const currentMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { 
      workspaceId: true,
      role: true,
      customRoleId: true,
    },
  });

  if (!currentMember) {
    throw new AppError(404, 'Member not found');
  }

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: currentMember.workspaceId },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Check if member is currently an admin (either via role or custom role)
  const isCurrentlyAdmin = currentMember.role === 'ADMIN';
  
  // Check if trying to demote from ADMIN to MEMBER
  const isDemotingAdmin = isCurrentlyAdmin && data.role === 'MEMBER';
  
  // If demoting an admin, check if they're the last admin
  if (isDemotingAdmin) {
    const adminCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: currentMember.workspaceId,
        role: 'ADMIN',
      },
    });

    if (adminCount <= 1) {
      throw new AppError(
        400,
        'Cannot demote the last admin. Please promote another member to admin first, or remove this member instead.'
      );
    }
  }

  // Validate custom role if provided
  if (data.customRoleId) {
    const customRole = await prisma.customRole.findFirst({
      where: {
        id: data.customRoleId,
        workspaceId: currentMember.workspaceId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!customRole) {
      throw new AppError(404, 'Custom role not found or does not belong to this workspace');
    }

    // Check if custom role has admin-equivalent permissions
    // If demoting from ADMIN to a custom role, check if it's the last admin
    if (isCurrentlyAdmin) {
      // Check if custom role has workspace management permissions (admin-like)
      const hasAdminPermissions = customRole.permissions.some(
        (rp) => rp.permission.resource === 'workspaces' && 
                (rp.permission.action === 'manage' || rp.permission.action === 'update')
      );

      // If custom role doesn't have admin permissions, treat as demotion
      if (!hasAdminPermissions) {
        const adminCount = await prisma.workspaceMember.count({
          where: {
            workspaceId: currentMember.workspaceId,
            role: 'ADMIN',
          },
        });

        if (adminCount <= 1) {
          throw new AppError(
            400,
            'Cannot demote the last admin. Please promote another member to admin first, or assign a custom role with admin permissions.'
          );
        }
      }
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
  // Verify member exists and get workspace
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { workspaceId: true },
  });

  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: member.workspaceId },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Validate that all groups belong to the same workspace
  if (data.groupIds && data.groupIds.length > 0) {
    const groups = await prisma.group.findMany({
      where: {
        id: { in: data.groupIds },
        workspaceId: member.workspaceId,
      },
    });

    if (groups.length !== data.groupIds.length) {
      throw new AppError(400, 'One or more groups do not belong to this workspace');
    }
  }

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
  // Verify member exists and get their role
  const member = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { 
      workspaceId: true,
      role: true,
    },
  });

  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: member.workspaceId },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  const totalMembers = await prisma.workspaceMember.count({
    where: { workspaceId: member.workspaceId },
  });

  // If the last member leaves, delete the workspace entirely.
  if (totalMembers <= 1) {
    await deleteWorkspace(member.workspaceId);
    return { message: 'Workspace deleted' };
  }

  // If the member being removed is the only admin, auto-promote someone else.
  if (member.role === 'ADMIN') {
    const adminCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: member.workspaceId,
        role: 'ADMIN',
      },
    });

    if (adminCount <= 1) {
      const nextAdmin = await prisma.workspaceMember.findFirst({
        where: { workspaceId: member.workspaceId, id: { not: memberId } },
        select: { id: true, role: true },
      });

      if (!nextAdmin) {
        await deleteWorkspace(member.workspaceId);
        return { message: 'Workspace deleted' };
      }

      if (nextAdmin.role !== 'ADMIN') {
        await prisma.workspaceMember.update({
          where: { id: nextAdmin.id },
          data: { role: 'ADMIN' },
        });
      }
    }
  }

  // Clean up references before deleting the member record.
  await Promise.all([
    prisma.groupAccess.deleteMany({ where: { memberId } }),
    prisma.callListItem.updateMany({ where: { workspaceId: member.workspaceId, assignedTo: memberId }, data: { assignedTo: null } }),
    prisma.followup.updateMany({ where: { workspaceId: member.workspaceId, assignedTo: memberId }, data: { assignedTo: null } }),
    // CallLog.assignedTo is required; delete logs to avoid dangling required relations.
    prisma.callLog.deleteMany({ where: { workspaceId: member.workspaceId, assignedTo: memberId } }),
  ]);

  await prisma.workspaceMember.delete({ where: { id: memberId } });

  // If only one member remains, ensure they are admin.
  const remaining = await prisma.workspaceMember.findMany({
    where: { workspaceId: member.workspaceId },
    select: { id: true, role: true },
  });

  if (remaining.length === 1 && remaining[0].role !== 'ADMIN') {
    await prisma.workspaceMember.update({
      where: { id: remaining[0].id },
      data: { role: 'ADMIN' },
    });
  }

  return { message: 'Member removed successfully' };
};

/**
 * Generate a secure random temporary password using cryptographically secure random bytes
 */
const generateTemporaryPassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercase[randomBytes[0] % uppercase.length];
  password += lowercase[randomBytes[1] % lowercase.length];
  password += numbers[randomBytes[2] % numbers.length];
  password += special[randomBytes[3] % special.length];

  // Fill the rest with cryptographically secure random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[randomBytes[i] % allChars.length];
  }

  // Shuffle the password using cryptographically secure random
  const shuffleBytes = crypto.randomBytes(password.length);
  return password
    .split('')
    .map((char, i) => ({ char, rand: shuffleBytes[i] }))
    .sort((a, b) => a.rand - b.rand)
    .map(({ char }) => char)
    .join('');
};

export const createMemberWithAccount = async (
  workspaceId: string,
  data: CreateMemberWithAccountInput
) => {
  // Verify workspace exists and check member limit for FREE plan
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: true,
    },
  });

  if (!workspace) {
    throw new AppError(404, 'Workspace not found');
  }

  // Plan enforcement is disabled unless BILLING_ENABLED=true.
  // Check member limit for FREE plan
  if (env.BILLING_ENABLED && workspace.plan === 'FREE') {
    const currentMemberCount = workspace.members.length;
    if (currentMemberCount >= 5) {
      throw new AppError(
        403,
        'Free plan allows a maximum of 5 members. Please upgrade to add more members.'
      );
    }
  }

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
  // IMPORTANT: We must explicitly set a unique verificationToken here.
  // If Prisma sends `verificationToken: null` for MongoDB with a unique index,
  // it can trigger `User_verificationToken_key` P2002 errors when another
  // user document already has a null value for that field.
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone,
      emailVerified: true, // Admin-created users are pre-verified
      mustChangePassword: true,
      temporaryPassword: true,
      // Use a unique, random verification token to avoid null-unique conflicts.
      // This token is not used for email verification (user is already verified),
      // but keeps the unique constraint satisfied.
      verificationToken: crypto.randomBytes(32).toString('hex'),
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
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

  // Get workspace name for email (workspace already fetched above)
  const workspaceName = workspace.name;

  // Send welcome email with temporary password
  try {
    await sendTemporaryPasswordEmail(
      user.email,
      user.name || 'User',
      workspaceName,
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

export const reinviteMemberWithAccount = async (workspaceId: string, memberId: string) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      workspace: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  if (member.setupCompleted) {
    throw new AppError(400, 'This member has already completed setup');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: member.userId },
    data: {
      passwordHash,
      mustChangePassword: true,
      temporaryPassword: true,
    },
  });

  try {
    await sendTemporaryPasswordEmail(
      member.user.email,
      member.user.name || 'User',
      member.workspace.name,
      temporaryPassword
    );
  } catch (error) {
    console.error('Failed to send temporary password email:', error);
  }

  return {
    message: 'Re-invitation sent. Temporary password reset and emailed to the member.',
    temporaryPassword,
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

