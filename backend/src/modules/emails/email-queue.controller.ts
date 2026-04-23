import { Response } from 'express';
import { prisma } from '../../db/client';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import { emailQueueService } from './email-queue.service';
import { createWorkerLock } from './email-worker-lock';
import { processEmailBatch } from './email-worker';

export const getQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const status = await emailQueueService.getQueueStatus(workspaceId);
  res.json(status);
});

export const getPendingEmails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10) || 20, 1), 100);

  const emails = await emailQueueService.getPendingEmails(limit, workspaceId);
  res.json(emails);
});

export const getEmailDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const { queueId } = req.params;

  const email = await prisma.emailQueue.findFirst({
    where: {
      id: queueId,
      workspaceId,
    },
  });

  if (!email) {
    res.status(404).json({ error: 'Email queue item not found' });
    return;
  }

  const log = await prisma.emailLog.findFirst({
    where: {
      queueId,
      workspaceId,
    },
  });

  res.json({ email, log });
});

export const retryEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const { queueId } = req.params;

  const email = await prisma.emailQueue.findFirst({
    where: {
      id: queueId,
      workspaceId,
    },
  });

  if (!email) {
    res.status(404).json({ error: 'Email queue item not found' });
    return;
  }

  await emailQueueService.scheduleRetry(queueId);
  res.json({ success: true, queueId });
});

export const cancelEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const { queueId } = req.params;

  const email = await prisma.emailQueue.findFirst({
    where: {
      id: queueId,
      workspaceId,
    },
  });

  if (!email) {
    res.status(404).json({ error: 'Email queue item not found' });
    return;
  }

  await emailQueueService.cancelEmail(queueId);
  res.json({ success: true, queueId });
});

export const getEmailLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user!.workspaceId;
  const days = Math.min(Math.max(parseInt((req.query.days as string) || '7', 10) || 7, 1), 90);
  const status = (req.query.status as string | undefined)?.toUpperCase();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await prisma.emailLog.findMany({
    where: {
      workspaceId,
      sentAt: { gte: since },
      ...(status ? { status } : {}),
    },
    orderBy: { sentAt: 'desc' },
    take: 200,
  });

  res.json(logs);
});

export const processQueueNow = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const lock = createWorkerLock();
  const lockAcquired = await lock.acquire();

  if (!lockAcquired) {
    res.status(409).json({
      success: false,
      reason: 'Another worker is processing',
    });
    return;
  }

  try {
    const result = await processEmailBatch();
    res.json({ success: true, ...result });
  } finally {
    await lock.release();
  }
});
