import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as dashboardService from './dashboard.service';

export const getDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getDashboardSummary(
    req.user!.workspaceId!,
    req.validatedData
  );
  res.json(result);
});

export const getKPIs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getKPIs(req.user!.workspaceId!, req.validatedData);
  res.json(result);
});

export const getCallsByStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getCallsByStatus(req.user!.workspaceId!, req.validatedData);
  res.json(result);
});

export const getFollowupsByStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getFollowupsByStatus(
    req.user!.workspaceId!,
    req.validatedData
  );
  res.json(result);
});

export const getStudentsByGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getStudentsByGroup(req.user!.workspaceId!);
  res.json(result);
});

export const getStudentsByBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await dashboardService.getStudentsByBatch(req.user!.workspaceId!);
  res.json(result);
});

export const getCallsTrend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';
  const result = await dashboardService.getCallsTrend(req.user!.workspaceId!, period);
  res.json(result);
});

export const getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await dashboardService.getRecentActivity(req.user!.workspaceId!, limit);
  res.json(result);
});

