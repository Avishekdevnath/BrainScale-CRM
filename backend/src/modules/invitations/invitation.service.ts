import { prisma } from '../../db/client';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error-handler';
import { logger } from '../../config/logger';
import { sendInvitationEmail } from '../../utils/email';
import crypto from 'crypto';
import { SendInvitationInput, AcceptInvitationInput } from './invitation.schemas';

/**
 * Generate a secure invitation token
 */
const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a temporary password for manual sharing
 */
const generateTemporaryPassword = (): string => {
  // Generate a 12-character password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Send invitation to a user
 */
export const sendInvitation = async (
  workspaceId: string,
  inviterUserId: string,
  data: SendInvitationInput
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

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      memberships: {
        where: { workspaceId },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    throw new AppError(409, 'User is already a member of this workspace');
  }

  // Check if there's already a pending invitation
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email: data.email,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new AppError(409, 'A pending invitation already exists for this email');
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
      throw new AppError(404, 'Custom role not found');
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

  // Create invitation
  const token = generateInvitationToken();
  const temporaryPassword = generateTemporaryPassword();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Store groupIds in meta field (since Invitation model doesn't have groupIds field)
  const meta = data.groupIds && data.groupIds.length > 0 ? { groupIds: data.groupIds } : null;

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email: data.email,
      token,
      role: data.role || 'MEMBER',
      customRoleId: data.customRoleId,
      invitedBy: inviterUserId,
      expiresAt,
      status: 'PENDING',
      temporaryPassword,
      emailSent: false, // Will be updated after email send attempt
      meta: meta as any,
    },
    include: {
      workspace: {
        select: { name: true },
      },
      customRole: {
        select: { name: true, description: true },
      },
    },
  });

  // Get inviter name
  const inviter = await prisma.user.findUnique({
    where: { id: inviterUserId },
    select: { name: true },
  });

  // Try to send invitation email
  let emailSent = false;
  let emailError: string | null = null;
  try {
    await sendInvitationEmail(
      data.email,
      invitation.workspace.name,
      token,
      inviter?.name || 'A team member'
    );
    emailSent = true;
  } catch (error: any) {
    emailError = error?.message || 'Failed to send email';
    logger.warn({ invitationId: invitation.id, error: emailError }, 'Email send failed, but invitation created successfully');
    // Don't throw - invitation is already created, admin can see the password and share it manually
  }

  // Update invitation with email status
  if (!emailSent) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { emailSent: false },
    });
  } else {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { emailSent: true },
    });
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    customRole: invitation.customRole,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
    temporaryPassword, // Return temporary password for admin to see
    emailSent, // Flag indicating if email was actually sent
    emailError: emailError || undefined, // Return error message if email failed
    message: emailSent
      ? 'Invitation sent successfully'
      : 'Invitation created but email could not be sent. Please share the temporary password with the user manually.',
  };
};

/**
 * Get invitation by token
 */
export const getInvitationByToken = async (token: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      customRole: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(400, 'Invitation has already been used or cancelled');
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError(400, 'Invitation has expired');
  }

  return invitation;
};

/**
 * Accept invitation (called during signup)
 */
export const acceptInvitation = async (token: string, userId: string) => {
  const invitation = await getInvitationByToken(token);

  // Check member limit for FREE plan (in case limit was reached between sending and accepting)
  const workspace = await prisma.workspace.findUnique({
    where: { id: invitation.workspaceId },
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
      // Mark invitation as expired/cancelled since limit was reached
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'CANCELLED' },
      });
      throw new AppError(
        403,
        'This workspace has reached the maximum member limit for the free plan. Please contact the workspace administrator.'
      );
    }
  }

  // Check if user is already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: invitation.workspaceId,
      },
    },
  });

  if (existingMember) {
    // Mark invitation as accepted even if already a member
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    throw new AppError(409, 'You are already a member of this workspace');
  }

  // Get groupIds from invitation meta
  const meta = invitation.meta as { groupIds?: string[] } | null;
  const groupIds = meta?.groupIds || [];

  // Create workspace membership with group access
  const member = await prisma.workspaceMember.create({
    data: {
      userId,
      workspaceId: invitation.workspaceId,
      role: invitation.role,
      customRoleId: invitation.customRoleId,
      groupAccess: groupIds.length > 0
        ? {
            create: groupIds.map((groupId) => ({
              groupId,
            })),
          }
        : undefined,
    },
  });

  // Mark invitation as accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });

  return {
    workspaceId: invitation.workspaceId,
    workspaceName: invitation.workspace.name,
    role: invitation.role,
    customRole: invitation.customRole,
    memberId: member.id,
  };
};

/**
 * List invitations for a workspace
 */
export const listInvitations = async (workspaceId: string) => {
  const invitations = await prisma.invitation.findMany({
    where: { workspaceId },
    include: {
      customRole: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    customRole: inv.customRole,
    status: inv.status,
    expiresAt: inv.expiresAt,
    temporaryPassword: inv.temporaryPassword, // Include for manual sharing
    emailSent: inv.emailSent,
    createdAt: inv.createdAt,
  }));
};

/**
 * Cancel an invitation
 */
export const cancelInvitation = async (invitationId: string, workspaceId: string) => {
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      workspaceId,
      status: 'PENDING',
    },
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found or already processed');
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: 'CANCELLED' },
  });

  return { message: 'Invitation cancelled successfully' };
};

/**
 * Resend an invitation (reinvite)
 * - Works for PENDING (even if expired), EXPIRED, or CANCELLED
 * - Generates a new token and extends expiry
 */
export const resendInvitation = async (
  invitationId: string,
  workspaceId: string,
  inviterUserId: string
) => {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, workspaceId },
    include: {
      workspace: { select: { name: true, plan: true, members: true } },
      customRole: { select: { id: true, name: true, description: true } },
    },
  });

  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }

  if (invitation.status === 'ACCEPTED') {
    throw new AppError(400, 'Invitation has already been accepted');
  }

  // If the invited user already joined since this invite was created, block resending.
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    include: {
      memberships: {
        where: { workspaceId },
        select: { id: true },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    throw new AppError(409, 'User is already a member of this workspace');
  }

  // Plan enforcement is disabled unless BILLING_ENABLED=true.
  if (env.BILLING_ENABLED && invitation.workspace.plan === 'FREE') {
    const currentMemberCount = invitation.workspace.members.length;
    if (currentMemberCount >= 5) {
      throw new AppError(
        403,
        'Free plan allows a maximum of 5 members. Please upgrade to add more members.'
      );
    }
  }

  // Ensure custom role still exists; if not, fall back to enum role only.
  let customRoleId: string | null = invitation.customRoleId ?? null;
  if (customRoleId) {
    const exists = await prisma.customRole.findFirst({
      where: { id: customRoleId, workspaceId },
      select: { id: true },
    });
    if (!exists) {
      customRoleId = null;
    }
  }

  // Filter groupIds in meta to active groups only (avoid broken group access on accept).
  const meta = invitation.meta as { groupIds?: string[] } | null;
  const groupIds = meta?.groupIds ?? [];
  let nextMeta: { groupIds?: string[] } | null = meta ?? null;
  if (groupIds.length > 0) {
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds }, workspaceId, isActive: true },
      select: { id: true },
    });
    const activeIds = groups.map((g) => g.id);
    nextMeta = activeIds.length ? { groupIds: activeIds } : null;
  }

  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      token,
      expiresAt,
      status: 'PENDING',
      invitedBy: inviterUserId,
      customRoleId,
      emailSent: false, // Reset email sent status
      meta: (nextMeta as any) ?? null,
    },
    include: {
      workspace: { select: { name: true } },
    },
  });

  const inviter = await prisma.user.findUnique({
    where: { id: inviterUserId },
    select: { name: true },
  });

  // Try to send invitation email
  let emailSent = false;
  let emailError: string | null = null;
  try {
    await sendInvitationEmail(
      updated.email,
      updated.workspace.name,
      token,
      inviter?.name || 'A team member'
    );
    emailSent = true;
  } catch (error: any) {
    emailError = error?.message || 'Failed to send email';
    logger.warn({ invitationId: updated.id, error: emailError }, 'Email resend failed, but invitation updated successfully');
  }

  // Update email status
  if (emailSent) {
    await prisma.invitation.update({
      where: { id: updated.id },
      data: { emailSent: true },
    });
  }

  return {
    id: updated.id,
    email: updated.email,
    expiresAt: updated.expiresAt,
    status: updated.status,
    temporaryPassword: updated.temporaryPassword, // Return temp password if email fails
    emailSent, // Flag indicating if email was actually sent
    emailError: emailError || undefined, // Return error message if email failed
    message: emailSent
      ? 'Invitation resent successfully'
      : 'Invitation updated but email could not be sent. Please share the temporary password with the user manually.',
  };
};
