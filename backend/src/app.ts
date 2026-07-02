import express, { Express } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './config/logger';
import { mountSwagger } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter, healthCheckLimiter } from './middleware/rate-limit';
import { prisma } from './db/client';

// Create Express app
export const app: Express = express();

// Compress all responses (gzip/deflate) — skip small responses (<1kb) automatically
app.use(compression());

// Prevent accidental cross-user caching (ETag/304) for API responses behind shared caches/browsers.
// All authenticated API routes should be treated as non-cacheable unless explicitly designed otherwise.
app.set('etag', false);

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
  // Cache preflight responses for 24h so browsers don't send OPTIONS before every request
  maxAge: 86400,
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
// 4MB stays under Vercel's 4.5MB serverless request body cap
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Cookie parsing (required for httpOnly refresh token cookies)
app.use(cookieParser());

// Disable caching for API routes to avoid leaking tenant-scoped data between users/workspaces
// via browser/proxy revalidation (304 Not Modified with a stale body).
app.use('/api/v1', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.vary('Authorization');
  res.vary('X-Workspace-Id');
  next();
});

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

// Request logging (only for team-chat in development)
app.use((req, res, next) => {
  if (env.NODE_ENV === 'development' && req.path.includes('team-chat')) {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     description: Returns server status. Use for uptime monitoring and liveness probes.
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
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
  
  const resendConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.length > 0);

  const config = {
    currentProvider: 'resend',
    resend: {
      configured: resendConfigured,
      hasApiKey: Boolean(env.RESEND_API_KEY),
      apiKeyPreview: env.RESEND_API_KEY
        ? `re_${env.RESEND_API_KEY.substring(3, 6)}***${env.RESEND_API_KEY.slice(-4)}`
        : 'not set',
    },
    email: {
      from: env.EMAIL_FROM,
      fromName: env.EMAIL_FROM_NAME,
      replyTo: env.EMAIL_REPLY_TO,
    },
  };

  res.json({
    status: resendConfigured ? 'configured' : 'not_configured',
    config,
    message: resendConfigured
      ? 'Resend API is configured. Check Resend dashboard if emails are not delivered.'
      : 'RESEND_API_KEY is missing. Set it in environment variables.',
    recommendations: resendConfigured ? [] : ['Set RESEND_API_KEY'],
  });
});

// Mount Swagger docs
mountSwagger(app);

// API Routes
type CheckResult = { status: 'ok' | 'error' | 'not_configured' | 'disabled'; latencyMs?: number; message?: string };

const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
};

let dbPingCache: { result: CheckResult; expiresAt: number } | null = null;
const DB_PING_TTL_MS = 30_000;

const checkDatabase = async (): Promise<CheckResult> => {
  if (dbPingCache && Date.now() < dbPingCache.expiresAt) return dbPingCache.result;
  const start = Date.now();
  try {
    await withTimeout(prisma.$runCommandRaw({ ping: 1 }), 5000);
    const result: CheckResult = { status: 'ok', latencyMs: Date.now() - start };
    dbPingCache = { result, expiresAt: Date.now() + DB_PING_TTL_MS };
    return result;
  } catch (err: any) {
    const result: CheckResult = { status: 'error', latencyMs: Date.now() - start, message: err?.message || 'ping failed' };
    dbPingCache = { result, expiresAt: Date.now() + DB_PING_TTL_MS };
    return result;
  }
};

const checkResend = (): CheckResult => {
  if (!env.RESEND_API_KEY) return { status: 'not_configured', message: 'RESEND_API_KEY missing' };
  return { status: 'ok', message: 'API key set (no live probe)' };
};

const checkAI = (): CheckResult => {
  if (!env.AI_ENABLED) return { status: 'disabled' };
  const provider = env.AI_PROVIDER;
  if (provider === 'openai') {
    return env.OPENAI_API_KEY
      ? { status: 'ok', message: 'openai key set' }
      : { status: 'not_configured', message: 'OPENAI_API_KEY missing' };
  }
  if (provider === 'anthropic') {
    return env.ANTHROPIC_API_KEY
      ? { status: 'ok', message: 'anthropic key set' }
      : { status: 'not_configured', message: 'ANTHROPIC_API_KEY missing' };
  }
  return { status: 'not_configured', message: `unknown AI_PROVIDER: ${provider}` };
};

app.get('/api/v1', healthCheckLimiter, async (req, res) => {
  const [database] = await Promise.all([checkDatabase()]);
  const resend = checkResend();
  const ai = checkAI();

  const blocking = [database.status, resend.status];
  const overall: 'ok' | 'degraded' = blocking.every((s) => s === 'ok') ? 'ok' : 'degraded';

  const isProd = env.NODE_ENV === 'production';
  const debugSecret = process.env.STATUS_DEBUG_SECRET;
  const showDetails =
    !isProd || (Boolean(debugSecret) && req.query.secret === debugSecret);

  const sanitize = (c: CheckResult): CheckResult =>
    showDetails ? c : { status: c.status };

  res.status(overall === 'ok' ? 200 : 503).json({
    message: 'BrainScale CRM SaaS API v1',
    version: '1.0.0',
    docs: '/api/docs',
    status: overall,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    connections: {
      database: sanitize(database),
      resend: sanitize(resend),
      ai: sanitize(ai),
    },
  });
});

// Module routers
import authRouter from './modules/auth/auth.router';
import platformRouter from './modules/platform/platform.router';
import feedbackRouter from './modules/feedback/feedback.router';
import { requireFeature } from './middleware/feature-guard';
import workspacePlatformFeaturesRouter from './modules/workspaces/workspace-platform-features.router';
import workspaceRouter from './modules/workspaces/workspace.router';
import invitationRouter, { publicInvitationRouter } from './modules/invitations/invitation.router';
import formsRouter, { publicFormsRouter } from './modules/forms/forms.router';
import roleRouter from './modules/roles/role.router';
import callRouter, { studentCallRouter, groupCallRouter } from './modules/calls/call.router';
import followupRouter, { groupFollowupRouter } from './modules/followups/followup.router';
import notificationRouter from './modules/notifications/notification.router';
import callListRouter, { callListItemRouter } from './modules/call-lists/call-list.router';
import callLogRouter from './modules/call-lists/call-log.router';
import callDraftRouter from './modules/call-lists/call-draft.router';
import myCallsRouter from './modules/call-lists/my-calls.router';
import questionPresetRouter from './modules/question-presets/question-preset.router';
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
import emailQueueRouter from './modules/emails/email-queue.router';
import revenueRouter from './modules/revenue/revenue.router';
import aiChatRouter from './modules/ai-chat/ai-chat.router';
import userRouter from './modules/users/user.router';
import taskRouter from './modules/tasks/task.router';
import scheduleRouter from './modules/schedule/schedule.router';
import auditLogRouter from './modules/audit-logs/audit-log.router';
import teamChatRouter from './modules/team-chat/team-chat.router';
import { usageBeat } from './middleware/usage-beat';

app.use('/api/v1', usageBeat); // usage tracking beat (no-op for unauthenticated requests)
app.use('/api/v1/auth', authRouter);
// roleRouter MUST mount before workspaceRouter: its literal routes
// (/available-permissions, /initialize-permissions) would otherwise be
// shadowed by workspaceRouter's GET /:workspaceId catch-all.
app.use('/api/v1/workspaces', roleRouter); // Nested under workspaces
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/workspaces', invitationRouter); // Nested under workspaces
app.use('/api/v1', publicInvitationRouter); // Public invitation endpoint
app.use('/api/v1/workspaces', formsRouter); // Forms management (workspace-scoped)
app.use('/api/v1', publicFormsRouter); // Public forms submit endpoint
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
app.use('/api/v1/notifications', notificationRouter); // Notifications routes
app.use('/api/v1/call-lists', callListRouter); // Call lists routes
app.use('/api/v1/call-list-items', callListItemRouter); // Call list items routes
app.use('/api/v1/call-logs', callLogRouter); // Call logs routes
app.use('/api/v1/call-drafts', callDraftRouter); // Call drafts routes
app.use('/api/v1/my-calls', myCallsRouter); // My Calls routes
app.use('/api/v1/question-presets', questionPresetRouter); // Question Presets routes
app.use('/api/v1/courses', courseRouter); // Courses routes
app.use('/api/v1/courses', courseModuleRouter); // Course modules nested route
app.use('/api/v1/modules', moduleRouter); // Modules routes
app.use('/api/v1/enrollments', enrollmentRouter); // Enrollments routes
app.use('/api/v1/progress', progressRouter); // Module progress routes
app.use('/api/v1/imports', importRouter); // Imports routes
app.use('/api/v1/exports', exportRouter); // Exports routes
app.use('/api/v1/dashboard', dashboardRouter); // Dashboard routes
app.use('/api/v1/emails', emailRouter); // Email routes
app.use('/api/v1/admin/email-queue', emailQueueRouter); // Email queue admin routes
app.use('/api/v1/revenue', requireFeature('revenue'), revenueRouter); // Revenue routes
app.use('/api/v1/ai-chat', requireFeature('ai'), aiChatRouter); // AI Chat routes
app.use('/api/v1/users', userRouter); // User account routes
app.use('/api/v1/workspace', workspacePlatformFeaturesRouter); // read-only platform flags for app users
app.use('/api/v1/tasks', requireFeature('tasks'), taskRouter); // Tasks routes
app.use('/api/v1/schedule', scheduleRouter); // Weekly schedule + exceptions routes
app.use('/api/v1/audit-logs', auditLogRouter); // Audit logs routes
app.use('/api/v1/team-chat', teamChatRouter); // Team Chat routes
app.use('/api/v1/platform', platformRouter); // Platform super-admin routes
app.use('/api/v1/feedback', feedbackRouter); // User-facing feedback routes

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

