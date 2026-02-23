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

/**
 * Send a direct test email (admin-only utility)
 */
export const sendTestEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { to, subject, message } = req.body || {};

  if (!to || typeof to !== 'string') {
    res.status(400).json({ error: 'Recipient email (to) is required' });
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(to.trim())) {
    res.status(400).json({ error: 'Invalid recipient email address' });
    return;
  }

  const normalizedSubject =
    typeof subject === 'string' && subject.trim().length > 0
      ? subject.trim()
      : 'SMTP Test Email';

  const normalizedMessage =
    typeof message === 'string' && message.trim().length > 0
      ? message.trim()
      : 'This is a test email from BrainScale CRM.';

  const result = await emailService.sendTestEmail(
    to.trim(),
    normalizedSubject,
    normalizedMessage
  );

  res.json({
    message: 'Test email sent successfully',
    ...result,
  });
});

