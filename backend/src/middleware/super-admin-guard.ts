import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-guard';
import { AppError } from './error-handler';
import { prisma } from '../db/client';

/**
 * Gate for platform super-admin routes. Runs after `authGuard`.
 * Checks `isSuperAdmin` fresh from the DB every request (never from the token),
 * so revoking the flag takes effect immediately.
 */
export const requireSuperAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError(401, 'Authentication required');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    if (!user || !(user as any).isSuperAdmin) {
      throw new AppError(403, 'Super-admin access required');
    }
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(403, 'Super-admin access required'));
  }
};
