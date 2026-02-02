import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../auth/jwt';
import { AppError } from './error-handler';

// Explicitly type params as string values (Express' default can allow string[] for unnamed regex params).
export interface AuthRequest extends Request<Record<string, string>, any, any, any> {
  user?: JWTPayload;
  validatedData?: any; // Populated by zodValidator middleware
}

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No authentication token provided');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, 'Invalid or expired token'));
    }
  }
};

export const requireRole = (...roles: Array<string>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    
    // Normalize roles to uppercase for case-insensitive comparison
    const userRole = req.user.role?.toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    
    next();
  };
};

