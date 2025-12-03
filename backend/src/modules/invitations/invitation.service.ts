import { prisma } from '../../db/client';
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
 * Send invitation to a user
 */
export const sendInvitation = async (
  workspaceId: string,
  inviterUserId: string,
  data: SendInvitationInput
) => {
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

  // Send invitation email
  try {
    await sendInvitationEmail(
      data.email,
      invitation.workspace.name,
      token,
      inviter?.name || 'A team member'
    );
  } catch (error) {
    // Log error but don't fail the invitation creation
    logger.error({ error, invitationId: invitation.id }, 'Failed to send invitation email');
    // You might want to queue this for retry in production
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    customRole: invitation.customRole,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
    message: 'Invitation sent successfully',
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

  return invitations;
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

