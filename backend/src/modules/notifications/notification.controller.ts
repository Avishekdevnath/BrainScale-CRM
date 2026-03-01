import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as notificationService from './notification.service';

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.listNotifications(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await notificationService.getUnreadCount(
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json({ unreadCount: count });
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await notificationService.markAsRead(
    req.params.id,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  await notificationService.markAllAsRead(req.user!.workspaceId!, req.user!.sub);
  res.json({ success: true });
});

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  await notificationService.deleteNotification(
    req.params.id,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json({ success: true });
});

export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const prefs = await notificationService.getPreferences(
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(prefs);
});

export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
  const prefs = await notificationService.updatePreferences(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(prefs);
});
