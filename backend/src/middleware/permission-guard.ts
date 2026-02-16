import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-guard';
import { AppError } from './error-handler';

/**
 * Middleware to check if user has required permission
 * ADMIN role bypasses all permission checks (full access)
 * Custom roles must have explicit permission or "manage" permission for the resource
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    // ADMIN role has full access - bypass permission checks (case-insensitive)
    if (req.user.role?.toUpperCase() === 'ADMIN') {
      return next();
    }

    // Product rule: all workspace members can create/update call lists.
    if (
      req.user.role?.toUpperCase() === 'MEMBER' &&
      resource === 'call_lists' &&
      (action === 'create' || action === 'update')
    ) {
      return next();
    }

    // Get user permissions (loaded by tenantGuard)
    const permissions = req.user.permissions || [];

    // Check if user has the specific permission
    const hasSpecificPermission = permissions.some(
      (p) => p.resource === resource && p.action === action
    );

    if (hasSpecificPermission) {
      return next();
    }

    // Check if user has "manage" permission for the resource (grants all actions)
    const hasManagePermission = permissions.some(
      (p) => p.resource === resource && p.action === 'manage'
    );

    if (hasManagePermission) {
      return next();
    }

    // Permission denied
    return next(
      new AppError(
        403,
        `Insufficient permissions. Required: ${resource}:${action}`
      )
    );
  };
};

