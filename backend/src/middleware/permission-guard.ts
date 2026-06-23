import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-guard';
import { AppError } from './error-handler';

/**
 * Middleware to check if user has required permission.
 * OWNER and ADMIN bypass all checks (full access).
 * MEMBER and CUSTOM roles must have explicit DB permission or "manage" for the resource.
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    // OWNER and ADMIN have full access — bypass all permission checks
    const level = req.user.roleLevel || req.user.role?.toUpperCase();
    if (level === 'OWNER' || level === 'ADMIN') {
      return next();
    }

    // Check DB-loaded permissions (set by tenantGuard from customRole)
    const permissions = req.user.permissions || [];

    const hasPermission = permissions.some(
      (p) =>
        p.resource === resource &&
        (p.action === action || p.action === 'manage')
    );

    if (hasPermission) {
      return next();
    }

    return next(
      new AppError(403, `Insufficient permissions. Required: ${resource}:${action}`)
    );
  };
};

