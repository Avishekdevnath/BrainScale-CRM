import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many file uploads, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for resend verification email
 * Allows 10 requests per 15 minutes per IP to prevent abuse while allowing legitimate retries
 */
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 resends per 15 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many verification email requests. Please wait 2 minutes between retries.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password reset
 * Allows 50 requests per 15 minutes per IP
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for health check endpoint
 * Recommended interval: 10 minutes
 * Allows 10 requests per 10 minutes per IP to accommodate monitoring systems
 */
export const healthCheckLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests per 10 minutes per IP
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Health check rate limit exceeded. Recommended interval: 10 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful health checks
});

