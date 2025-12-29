import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './config/logger';
import { mountSwagger } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter, healthCheckLimiter } from './middleware/rate-limit';

// Create Express app
export const app: Express = express();

// Trust proxy - required when behind reverse proxy/load balancer (Kubernetes, Render, etc.)
// This allows Express to correctly identify client IPs from X-Forwarded-For headers
app.set('trust proxy', true);

// CORS (must be before helmet to allow preflight requests)
// Environment-aware CORS configuration:
// - Development: Allow all origins for local testing
// - Production: Restrict to CORS_ORIGINS from environment variables
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In development, allow all origins
    if (env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    // If no origin (e.g., Postman, curl), allow it (for API testing)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed list
    const allowedOrigins = env.CORS_ORIGINS;
    if (allowedOrigins.length === 0) {
      // If CORS_ORIGINS is not set, log warning but allow (for backward compatibility during migration)
      logger.warn('CORS_ORIGINS not configured. Allowing all origins in production. Please set CORS_ORIGINS environment variable.');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Origin not allowed
    logger.warn({ origin, allowedOrigins }, 'CORS: Origin not allowed');
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Cron-Secret'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      // SECURITY NOTE: 'unsafe-inline' is used for scripts and styles
      // This is often required for Next.js apps due to dynamic script/style injection
      // and inline event handlers. However, it reduces XSS protection.
      // 
      // Security Risk: If malicious content is injected into the application,
      // 'unsafe-inline' allows it to execute inline scripts/styles, increasing XSS risk.
      // 
      // Recommendations for future hardening:
      // 1. Use nonces or hashes for trusted inline scripts/styles where possible
      // 2. Review all user-generated content and ensure proper sanitization
      // 3. Consider using stricter CSP in non-Next.js routes if applicable
      // 4. Monitor CSP violation reports to identify potential security issues
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"], // For <script> elements
      styleSrc: ["'self'", "'unsafe-inline'"],
      styleSrcElem: ["'self'", "'unsafe-inline'"], // For <style> elements
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
    },
  } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting is now opt-in per route
// To enable global rate limiting for all API routes, uncomment the line below:
// app.use('/api/v1', apiLimiter);
// 
// Note: Rate limiting can be controlled via RATE_LIMIT_ENABLED environment variable.
// - Set RATE_LIMIT_ENABLED=false to disable all rate limiting globally
// - When disabled, all rate limiters become no-op middlewares (pass through)
// - Individual routes can still use rate limiters (e.g., authLimiter in auth routes)
// - OPTIONS requests (CORS preflight) are always skipped to prevent CORS issues

// HTTPS enforcement only in production deployments (Vercel, etc.), not for local development
// Skip HTTPS enforcement if running locally (not in Vercel) or if localhost
if (env.NODE_ENV === 'production' && env.IS_VERCEL) {
  app.use((req, res, next) => {
    // Skip HTTPS enforcement for localhost/127.0.0.1 (local development)
    const host = req.headers.host || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0');
    
    if (!isLocalhost) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      if (proto !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
      }
    }
    next();
  });
}

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    originalUrl: req.originalUrl,
    url: req.url,
    baseUrl: req.baseUrl,
    path: req.path,
    ip: req.ip,
    isVercel: process.env.VERCEL === '1',
  }, 'Express received request');
  next();
});

// Health check
// Recommended interval: 10 minutes (configure in Kubernetes liveness/readiness probes)
// Rate limiter: 10 requests per 10 minutes per IP (skip successful requests)
app.get('/health', healthCheckLimiter, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Email configuration diagnostic endpoint (development/debugging only)
// Only accessible if SMTP_DEBUG_SECRET is set and matches the query parameter
app.get('/api/debug/email-config', (req, res) => {
  const debugSecret = process.env.SMTP_DEBUG_SECRET;
  
  // Only allow in development or with secret
  if (env.NODE_ENV === 'production' && (!debugSecret || req.query.secret !== debugSecret)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  // Check current email provider
  const currentProvider = env.EMAIL_PROVIDER;
  const sendgridConfigured = Boolean(env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.length > 0);
  const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS);
  
  const config = {
    currentProvider,
    sendgrid: {
      configured: sendgridConfigured,
      hasApiKey: Boolean(env.SENDGRID_API_KEY),
      apiKeyPreview: env.SENDGRID_API_KEY 
        ? `SG.${env.SENDGRID_API_KEY.substring(3, 6)}***${env.SENDGRID_API_KEY.slice(-4)}` 
        : 'not set',
    },
    smtp: {
      configured: smtpConfigured,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      hasUser: Boolean(env.SMTP_USER),
      hasPass: Boolean(env.SMTP_PASS),
      userPreview: env.SMTP_USER ? `${env.SMTP_USER.substring(0, 3)}***` : 'not set',
    },
    email: {
      from: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
      replyTo: env.EMAIL_REPLY_TO,
    },
  };
  
  // Determine status
  let status = 'not_configured';
  let message = '';
  
  if (currentProvider === 'sendgrid') {
    if (sendgridConfigured) {
      status = 'configured';
      message = 'SendGrid API is configured. Check SendGrid Activity page if emails are not being delivered.';
    } else {
      status = 'not_configured';
      message = 'SendGrid API is selected but SENDGRID_API_KEY is missing. Set it in Vercel environment variables.';
    }
  } else if (currentProvider === 'sendgrid-smtp') {
    if (sendgridConfigured && smtpConfigured) {
      status = 'configured';
      message = 'SendGrid SMTP is configured. Using smtp.sendgrid.net with API key authentication.';
    } else if (!sendgridConfigured) {
      status = 'not_configured';
      message = 'SendGrid SMTP is selected but SENDGRID_API_KEY is missing. Set it in Vercel environment variables.';
    } else {
      status = 'not_configured';
      message = 'SendGrid SMTP configuration incomplete. Check SMTP settings.';
    }
  } else if (currentProvider === 'smtp') {
    if (smtpConfigured) {
      status = 'configured';
      message = 'SMTP is configured. Check Vercel function logs if emails are not being sent.';
    } else {
      status = 'not_configured';
      message = 'SMTP is selected but credentials are missing. Set SMTP_USER and SMTP_PASS in Vercel environment variables.';
    }
  } else {
    status = 'invalid_provider';
    message = `Invalid EMAIL_PROVIDER: ${currentProvider}. Must be 'sendgrid', 'sendgrid-smtp', or 'smtp'.`;
  }
  
  res.json({
    status,
    config,
    message,
    recommendations: !sendgridConfigured && !smtpConfigured 
      ? ['Set SENDGRID_API_KEY for SendGrid, or SMTP_USER/SMTP_PASS for SMTP']
      : [],
  });
});

// Mount Swagger docs
mountSwagger(app);

// API Routes
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'BrainScale CRM SaaS API v1',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// Module routers
import authRouter from './modules/auth/auth.router';
import workspaceRouter from './modules/workspaces/workspace.router';
import invitationRouter, { publicInvitationRouter } from './modules/invitations/invitation.router';
import roleRouter from './modules/roles/role.router';
import callRouter, { studentCallRouter, groupCallRouter } from './modules/calls/call.router';
import followupRouter, { groupFollowupRouter } from './modules/followups/followup.router';
import callListRouter, { callListItemRouter } from './modules/call-lists/call-list.router';
import callLogRouter from './modules/call-lists/call-log.router';
import myCallsRouter from './modules/call-lists/my-calls.router';
import studentRouter from './modules/students/student.router';
import groupRouter, { batchGroupRouter } from './modules/groups/group.router';
import batchRouter from './modules/batches/batch.router';
import courseRouter from './modules/courses/course.router';
import moduleRouter, { courseModuleRouter } from './modules/modules/module.router';
import enrollmentRouter, { studentStatusRouter, progressRouter } from './modules/enrollments/enrollment.router';
import importRouter from './modules/imports/import.router';
import exportRouter from './modules/exports/export.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import emailRouter from './modules/emails/email.router';
import revenueRouter from './modules/revenue/revenue.router';
import aiChatRouter from './modules/ai-chat/ai-chat.router';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/workspaces', invitationRouter); // Nested under workspaces
app.use('/api/v1', publicInvitationRouter); // Public invitation endpoint
app.use('/api/v1/workspaces', roleRouter); // Nested under workspaces
// Note: /permissions endpoint is handled by roleRouter above
app.use('/api/v1/calls', callRouter); // Calls routes
app.use('/api/v1/students', studentRouter); // Students routes
app.use('/api/v1/students', studentCallRouter); // Student calls nested route
app.use('/api/v1/students', studentStatusRouter); // Student status nested route
app.use('/api/v1/groups', groupRouter); // Groups routes
app.use('/api/v1/groups', groupCallRouter); // Group calls nested route
app.use('/api/v1/groups', groupFollowupRouter); // Group follow-ups nested route
app.use('/api/v1/batches', batchRouter); // Batches routes
app.use('/api/v1/batches', batchGroupRouter); // Batch-Group alignment routes
app.use('/api/v1/followups', followupRouter); // Follow-ups routes
app.use('/api/v1/call-lists', callListRouter); // Call lists routes
app.use('/api/v1/call-list-items', callListItemRouter); // Call list items routes
app.use('/api/v1/call-logs', callLogRouter); // Call logs routes
app.use('/api/v1/my-calls', myCallsRouter); // My Calls routes
app.use('/api/v1/courses', courseRouter); // Courses routes
app.use('/api/v1/courses', courseModuleRouter); // Course modules nested route
app.use('/api/v1/modules', moduleRouter); // Modules routes
app.use('/api/v1/enrollments', enrollmentRouter); // Enrollments routes
app.use('/api/v1/progress', progressRouter); // Module progress routes
app.use('/api/v1/imports', importRouter); // Imports routes
app.use('/api/v1/exports', exportRouter); // Exports routes
app.use('/api/v1/dashboard', dashboardRouter); // Dashboard routes
app.use('/api/v1/emails', emailRouter); // Email routes
app.use('/api/v1/revenue', revenueRouter); // Revenue routes
app.use('/api/v1/ai-chat', aiChatRouter); // AI Chat routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

