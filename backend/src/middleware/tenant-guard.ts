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
    // Ensure user is authenticated (should be set by authGuard)
    // Add explicit check and logging for debugging
    if (!req.user) {
      console.error('[tenantGuard] req.user is undefined. authGuard may not have run or failed.');
      return next(new AppError(401, 'Authentication required'));
    }
    
    // Store user in local variable to ensure TypeScript type narrowing
    const user = req.user;
    if (!user || !user.sub) {
      console.error('[tenantGuard] req.user is invalid:', { user, hasSub: !!user?.sub });
      return next(new AppError(401, 'Authentication required'));
    }
    
    // Get workspaceId from multiple sources (in order of priority)
    // IMPORTANT: Prioritize X-Workspace-Id header over params to avoid route conflicts
    // (e.g., /workspaces/available-permissions should not match /workspaces/:workspaceId)
    const headerWorkspaceId = req.headers['x-workspace-id'] as string;
    
    // Safely access req.body.workspaceId (req.body may be undefined for GET requests)
    const bodyWorkspaceId = req.body && typeof req.body === 'object' && 'workspaceId' in req.body 
      ? (req.body as any).workspaceId 
      : undefined;
    
    // Check if params.workspaceId looks like a valid workspace ID (Prisma ID format: starts with 'c' and has length ~25)
    // This prevents routes like /available-permissions from being treated as workspace IDs
    const paramWorkspaceId = req.params.workspaceId;
    const isValidWorkspaceIdFormat = paramWorkspaceId && 
      typeof paramWorkspaceId === 'string' && 
      paramWorkspaceId.length > 20 && 
      paramWorkspaceId.length < 30 &&
      /^[a-z0-9]+$/i.test(paramWorkspaceId);
    
    // For routes with :workspaceId param, use it if it's valid, otherwise fall back to header
    // This handles both /workspaces/:workspaceId/roles and /workspaces/available-permissions
    const workspaceId = 
      (isValidWorkspaceIdFormat ? paramWorkspaceId : undefined) ||  // Use param if it looks like a valid ID
      headerWorkspaceId ||  // Fall back to header
      bodyWorkspaceId || 
      user.workspaceId;
    
    // Debug logging
    if (!workspaceId) {
      console.error('[tenantGuard] No workspace ID found:', {
        paramWorkspaceId,
        isValidFormat: isValidWorkspaceIdFormat,
        headerWorkspaceId,
        bodyWorkspaceId,
        userWorkspaceId: user.workspaceId,
        path: req.path,
        params: req.params,
      });
    }
    
    if (!workspaceId) {
      throw new AppError(400, 'Workspace ID required');
    }
    
    // Verify user is a member of the workspace and load permissions
    let membership;
    try {
      membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: req.user.sub,
          workspaceId: workspaceId,
        },
        include: {
          customRole: {
            include: {
              permissions: {
                include: {
                  permission: {
                    select: {
                      resource: true,
                      action: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (dbError: any) {
      console.error('[tenantGuard] Database error:', {
        error: dbError.message,
        code: dbError.code,
        userId: req.user.sub,
        workspaceId,
      });
      throw new AppError(500, 'Failed to verify workspace access');
    }
    
    if (!membership) {
      // Get user's available workspaces for better error message
      let userWorkspaces: Array<{ workspace: { id: string; name: string } }> = [];
      try {
        userWorkspaces = await prisma.workspaceMember.findMany({
          where: {
            userId: req.user.sub,
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      } catch (err) {
        // If we can't fetch workspaces, just continue with empty list
        console.error('[tenantGuard] Failed to fetch user workspaces:', err);
      }
      
      const availableWorkspaceIds = userWorkspaces.map((m) => m.workspace.id);
      
      // Log for debugging
      console.log('[tenantGuard] Access denied:', {
        userId: req.user.sub,
        requestedWorkspaceId: workspaceId,
        availableWorkspaceIds,
        path: req.path,
        params: req.params,
        header: req.headers['x-workspace-id'],
      });
      
      throw new AppError(
        403,
        `Access denied to workspace "${workspaceId}". You are not a member of this workspace. ${
          availableWorkspaceIds.length > 0
            ? `Available workspaces: ${availableWorkspaceIds.join(', ')}`
            : 'You have no workspace memberships.'
        }`
      );
    }
    
    // Update JWT payload with verified workspace
    req.user.workspaceId = workspaceId;
    // Normalize role to uppercase for consistent comparison (handles "Admin"/"ADMIN" variations)
    req.user.role = membership.role?.toUpperCase() || membership.role;
    
    // Load permissions from custom role (if exists)
    const permissions: Array<{ resource: string; action: string }> = [];

    // Default permissions for built-in roles when no custom role is assigned.
    // Without this, MEMBER users would have an empty permission set and receive 403s across the app.
    // NOTE: ADMIN bypasses permission checks in requirePermission().
    const defaultRolePermissions: Record<string, Array<{ resource: string; action: string }>> = {
      MEMBER: [
        { resource: 'workspace', action: 'read' },
        { resource: 'groups', action: 'read' },
        { resource: 'students', action: 'read' },
        { resource: 'batches', action: 'read' },
        { resource: 'courses', action: 'read' },
        { resource: 'modules', action: 'read' },
        { resource: 'enrollments', action: 'read' },
        { resource: 'followups', action: 'read' },
        { resource: 'calls', action: 'create' },
        { resource: 'calls', action: 'read' },
        { resource: 'call_lists', action: 'create' },
        { resource: 'call_lists', action: 'update' },
        { resource: 'call_lists', action: 'read' },
      ],
    };

    if (membership.customRole && membership.customRole.permissions) {
      try {
        membership.customRole.permissions.forEach((rp) => {
          if (rp && rp.permission) {
            permissions.push({
              resource: rp.permission.resource,
              action: rp.permission.action,
            });
          }
        });
      } catch (permError) {
        console.error('[tenantGuard] Error loading permissions:', permError);
        // Continue with empty permissions array - user will rely on role-based access
      }
    } else {
      const roleKey = (membership.role || '').toUpperCase();
      const defaults = defaultRolePermissions[roleKey] || [];
      defaults.forEach((p) => permissions.push(p));
    }
    req.user.permissions = permissions;
    
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
    
    // Admins have access to all groups (case-insensitive)
    if (req.user.role?.toUpperCase() === 'ADMIN') {
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

