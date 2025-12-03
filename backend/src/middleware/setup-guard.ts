import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-guard';
import { AppError } from './error-handler';
import { prisma } from '../db/client';

/**
 * Ensures the user has completed their account setup before accessing protected resources
 * This middleware should be applied to routes that require full workspace access
 * 
 * Note: This is optional - you can also handle setup checks in route handlers
 * or use a different approach based on your requirements
 */
export const requireSetupComplete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.user.workspaceId;

    if (!workspaceId) {
      // If no workspace context, allow access (user might be creating workspace)
      return next();
    }

    // Check if member has completed setup for this workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user.sub,
        workspaceId: workspaceId,
      },
      select: {
        setupCompleted: true,
        agreementAccepted: true,
      },
    });

    if (!membership) {
      throw new AppError(403, 'Access denied to this workspace');
    }

    // If setupCompleted is null/undefined, treat as completed (for backward compatibility)
    if (membership.setupCompleted === false) {
      throw new AppError(
        403,
        'Please complete your account setup first. Change your password and accept the agreement.',
        {
          requiresSetup: true,
          setupEndpoint: '/api/v1/auth/complete-setup',
        }
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

