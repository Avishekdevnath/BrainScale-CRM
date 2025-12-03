import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './config/logger';
import { mountSwagger } from './config/swagger';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';

// Create Express app
export const app: Express = express();

// CORS (must be before helmet to allow preflight requests)
// Open for testing - allows all origins
app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Cron-Secret'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (apply to all API routes)
app.use('/api/v1', apiLimiter);

// HTTPS enforcement in production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

