import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Rate limiting configuration
 * 
 * Rate limiting can be enabled/disabled via the RATE_LIMIT_ENABLED environment variable.
 * Set RATE_LIMIT_ENABLED=false to disable all rate limiting globally.
 * 
 * When disabled:
 * - All rate limiters become no-op middlewares (pass through)
 * - Useful for serverless environments where memory-based limiting doesn't work well
 * - Useful for development/testing
 * 
 * When enabled:
 * - Rate limiters enforce limits as configured
 * - OPTIONS requests (CORS preflight) are always skipped to prevent CORS issues
 * 
 * NOTE: In serverless environments (Vercel), memory-based rate limiting
 * won't work across function instances. Each instance maintains its own counter.
 * For production serverless, consider using:
 * - Vercel's built-in rate limiting
 * - Redis-based rate limiting (e.g., Upstash)
 * - External rate limiting service
 * - Or disable rate limiting (RATE_LIMIT_ENABLED=false) and use external solutions
 */

/**
 * Helper function to create a conditional rate limiter
 * Returns a no-op middleware if rate limiting is disabled, otherwise returns the actual rate limiter
 * 
 * @param config - Rate limiter configuration (same as express-rate-limit options)
 * @returns Express middleware (rate limiter or no-op)
 */
function createRateLimiter(config: Parameters<typeof rateLimit>[0] | undefined) {
  // If rate limiting is disabled globally, return a no-op middleware
  if (!env.RATE_LIMIT_ENABLED) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  // If no config provided, return no-op
  if (!config) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }
  
  // Extract skip function from config if it exists
  const originalSkip = config.skip;
  
  // Create rate limiter with automatic OPTIONS skipping
  return rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
      // Always skip OPTIONS requests (CORS preflight) to prevent CORS issues
      if (req.method === 'OPTIONS') {
        return true;
      }
      // Use custom skip function if provided in config
      if (originalSkip) {
        if (typeof originalSkip === 'function') {
          return originalSkip(req, res);
        }
        return originalSkip;
      }
      return false;
    },
  });
}

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks
 * 
 * Limits: 2000 requests per 15 minutes per IP
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per window per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts, please try again later',
    },
  },
});

/**
 * Rate limiter for general API endpoints
 * 
 * Limits: 10000 requests per 15 minutes per IP
 * 
 * NOTE: In serverless environments, this uses memory-based storage
 * which doesn't persist across function instances.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per window per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
});

/**
 * Rate limiter for file upload endpoints
 * 
 * Limits: 1000 uploads per hour per IP
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 uploads per hour per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many file uploads, please try again later',
    },
  },
});

/**
 * Rate limiter for resend verification email
 * Allows 1000 requests per 15 minutes per IP to prevent abuse while allowing legitimate retries
 * 
 * Limits: 1000 requests per 15 minutes per IP
 */
export const resendVerificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 resends per 15 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many verification email requests. Please wait 2 minutes between retries.',
    },
  },
});

/**
 * Rate limiter for password reset
 * 
 * Limits: 5000 requests per 15 minutes per IP
 */
export const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per 15 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts, please try again later',
    },
  },
});

/**
 * Rate limiter for health check endpoint
 * Recommended interval: 10 minutes
 * Allows 1000 requests per 10 minutes per IP to accommodate monitoring systems
 * 
 * Limits: 1000 requests per 10 minutes per IP
 * Note: Successful requests are not counted (skipSuccessfulRequests: true)
 */
export const healthCheckLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000, // 1000 requests per 10 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Health check rate limit exceeded. Recommended interval: 10 minutes',
    },
  },
  skipSuccessfulRequests: true, // Don't count successful health checks
});

/**
 * Check if rate limiting is currently enabled
 * 
 * @returns true if rate limiting is enabled, false otherwise
 */
export const isRateLimitEnabled = (): boolean => {
  return env.RATE_LIMIT_ENABLED;
};
