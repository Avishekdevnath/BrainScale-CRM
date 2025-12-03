import { Router } from 'express';
import * as emailController from './email.controller';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

/**
 * @openapi
 * /emails/daily-digest:
 *   post:
 *     summary: Send daily digest email to workspace members (for cron jobs or manual trigger)
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workspaceId:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional - send to specific user only
 *     responses:
 *       200:
 *         description: Daily digest sent
 */
import { env } from '../../config/env';
import { AuthRequest } from '../../middleware/auth-guard';
import { Response, NextFunction } from 'express';

// Middleware to allow cron secret or require auth
export const cronOrAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const cronSecret = req.headers['x-cron-secret'] as string;
  const expectedSecret = env.CRON_SECRET;

  // If cron secret is provided and matches, allow access
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    // Skip auth for cron jobs
    return next();
  }

  // Otherwise require authentication
  return authGuard(req, res, next);
};

router.post(
  '/daily-digest',
  cronOrAuth,
  requireRole('ADMIN'),
  emailController.sendDailyDigest
);

/**
 * @openapi
 * /emails/weekly-digest:
 *   post:
 *     summary: Send weekly digest email to workspace members (for cron jobs or manual trigger)
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workspaceId:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional - send to specific user only
 *     responses:
 *       200:
 *         description: Weekly digest sent
 */
router.post(
  '/weekly-digest',
  cronOrAuth,
  requireRole('ADMIN'),
  emailController.sendWeeklyDigest
);

/**
 * @openapi
 * /emails/followup-reminders:
 *   post:
 *     summary: Send followup reminder emails (for overdue and upcoming followups)
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workspaceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Followup reminders sent
 */
router.post(
  '/followup-reminders',
  cronOrAuth,
  requireRole('ADMIN'),
  emailController.sendFollowupReminders
);

/**
 * @openapi
 * /emails/process-scheduled:
 *   post:
 *     summary: Process all scheduled digests for all workspaces (cron endpoint)
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint processes all workspaces and sends digests based on their preferences.
 *       Should be called by a cron job every hour.
 *       Requires X-Cron-Secret header for cron access.
 *     responses:
 *       200:
 *         description: Scheduled digests processed
 */
router.post(
  '/process-scheduled',
  cronOrAuth,
  emailController.processScheduledDigestsEndpoint
);

export default router;

