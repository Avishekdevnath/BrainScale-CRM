import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-guard';
import { AppError } from './error-handler';
import { prisma } from '../db/client';

/**
 * Ensures the user has access to the workspace specified in the request
 */
export const tenantGuard = async (
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
      throw new AppError(400, 'Workspace ID required');
    }
    
    // Verify user is a member of the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user.sub,
        workspaceId: workspaceId,
      },
    });
    
    if (!membership) {
      throw new AppError(403, 'Access denied to this workspace');
    }
    
    // Update JWT payload with verified workspace
    req.user.workspaceId = workspaceId;
    req.user.role = membership.role;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Ensures the user has access to the specified group
 */
export const groupGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    
    const groupId = req.params.groupId || req.body.groupId;
    
    if (!groupId) {
      throw new AppError(400, 'Group ID required');
    }
    
    // Admins have access to all groups
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Check if member has access to this group
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user.sub,
        workspaceId: req.user.workspaceId,
      },
      include: {
        groupAccess: {
          where: {
            groupId: groupId,
          },
        },
      },
    });
    
    if (!membership || membership.groupAccess.length === 0) {
      throw new AppError(403, 'Access denied to this group');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

