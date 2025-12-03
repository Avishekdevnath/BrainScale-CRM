import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as emailService from './email.service';
import { processScheduledDigests } from './cron.service';

/**
 * Send daily digest (can be called by cron job or manually)
 */
export const sendDailyDigest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId || req.body.workspaceId;
  const userId = req.query.userId as string | undefined;

  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace ID is required' });
    return;
  }

  const result = await emailService.sendDailyDigest(workspaceId, userId);
  res.json({
    message: 'Daily digest processing completed',
    ...result,
  });
});

/**
 * Send weekly digest (can be called by cron job or manually)
 */
export const sendWeeklyDigest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId || req.body.workspaceId;
  const userId = req.query.userId as string | undefined;

  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace ID is required' });
    return;
  }

  const result = await emailService.sendWeeklyDigest(workspaceId, userId);
  res.json({
    message: 'Weekly digest processing completed',
    ...result,
  });
});

/**
 * Send followup reminders (for overdue and upcoming followups)
 */
export const sendFollowupReminders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId || req.body.workspaceId;

  if (!workspaceId) {
    res.status(400).json({ error: 'Workspace ID is required' });
    return;
  }

  const result = await emailService.sendFollowupReminders(workspaceId);
  res.json({
    message: 'Followup reminders processing completed',
    ...result,
  });
});

/**
 * Process all scheduled digests (cron endpoint - processes all workspaces)
 */
export const processScheduledDigestsEndpoint = asyncHandler(async (req: any, res: Response) => {
  const result = await processScheduledDigests();
  res.json({
    message: 'Scheduled digests processing completed',
    ...result,
  });
});

