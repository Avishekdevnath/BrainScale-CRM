import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import { AppError } from '../../middleware/error-handler';
import { prisma } from '../../db/client';
import * as scheduleService from './schedule.service';
import { syncScheduleToTasks } from './schedule-task-sync.service';

export const getTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await scheduleService.getActiveTemplate(req.user!.workspaceId!, req.user!.sub);
  res.json(data);
});

export const saveTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await scheduleService.saveTemplate(req.user!.workspaceId!, req.user!.sub, req.body);
  res.json(data);
});

export const listExceptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = String(req.query.date || '');
  const data = await scheduleService.listExceptionsForDate(req.user!.workspaceId!, req.user!.sub, date);
  res.json(data);
});

export const createException = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await scheduleService.createException(req.user!.workspaceId!, req.user!.sub, req.body);
  res.status(201).json(data);
});

export const deleteException = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await scheduleService.deleteException(req.user!.workspaceId!, req.user!.sub, req.params.id);
  res.json(data);
});

export const bulkUpdate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { templateId } = req.params;
  const { changes } = req.body;

  const data = await scheduleService.processBulkUpdate(
    req.user!.workspaceId!,
    req.user!.sub,
    templateId,
    changes
  );
  res.json(data);
});

export const broadcastSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { recipientEmails, formats, scheduleName } = req.body;
  const result = await scheduleService.broadcastSchedule(
    req.user!.workspaceId!,
    req.user!.sub,
    recipientEmails,
    formats,
    scheduleName
  );
  res.json(result);
});

export const triggerManualSyncCron = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Admin only
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: req.user!.sub, workspaceId: req.user!.workspaceId!, role: 'ADMIN' },
  });
  if (!member) throw new AppError(403, 'Only admins can trigger manual sync');

  const result = await syncScheduleToTasks(req.user!.workspaceId!);
  res.json({
    message: 'Manual sync triggered',
    result,
  });
});
