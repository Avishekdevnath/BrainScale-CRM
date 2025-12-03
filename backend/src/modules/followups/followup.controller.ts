import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as followupService from './followup.service';

export const createFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await followupService.createFollowup(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listGroupFollowups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const result = await followupService.listGroupFollowups(
    req.user!.workspaceId!,
    groupId,
    req.user!.sub,
    req.query as any
  );
  res.json(result);
});

export const listFollowups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await followupService.listFollowups(
    req.user!.workspaceId!,
    req.user!.sub,
    req.query as any
  );
  res.json(result);
});

export const getFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { followupId } = req.params;
  const followup = await followupService.getFollowup(followupId, req.user!.workspaceId!);
  res.json(followup);
});

export const updateFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { followupId } = req.params;
  const result = await followupService.updateFollowup(
    followupId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteFollowup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { followupId } = req.params;
  const result = await followupService.deleteFollowup(
    followupId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const getFollowupCallContext = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { followupId } = req.params;
  const result = await followupService.getFollowupCallContext(
    followupId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

