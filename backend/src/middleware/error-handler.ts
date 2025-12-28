import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  public metadata?: Record<string, any>;
  
  constructor(
    public statusCode: number,
    public message: string,
    metadataOrIsOperational?: Record<string, any> | boolean,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Handle backward compatibility: if second param is boolean, it's isOperational
    // If it's an object, it's metadata and third param is isOperational
    if (typeof metadataOrIsOperational === 'object' && metadataOrIsOperational !== null) {
      this.metadata = metadataOrIsOperational;
    } else if (typeof metadataOrIsOperational === 'boolean') {
      this.isOperational = metadataOrIsOperational;
    }
  }
}

const sanitizeHeaders = (headers: Record<string, any>): Record<string, any> => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-cron-secret', 'x-auth-token'];
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log full error details including stack trace
  logger.error({
    err: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err instanceof AppError && {
        statusCode: err.statusCode,
        isOperational: err.isOperational,
        metadata: err.metadata,
      }),
    },
    req: {
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
      ip: req.ip,
    },
  });

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: err.issues,
      },
    });
  }

  // Application error
  if (err instanceof AppError) {
    const errorResponse: any = {
      error: {
        code: err.name,
        message: err.message,
      },
    };
    
    // Include metadata if present (e.g., retryAfter, canRetryAt)
    if (err.metadata) {
      Object.assign(errorResponse.error, err.metadata);
    }
    
    return res.status(err.statusCode).json(errorResponse);
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'UNIQUE_CONSTRAINT_ERROR',
          message: 'A record with this value already exists',
          field: prismaError.meta?.target?.[0],
        },
      });
    }
    
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    }
  }

  // Default server error - provide more details in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(isDevelopment && {
        details: err.message,
        stack: err.stack,
      }),
    },
  });
};

export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

