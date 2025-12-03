import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as groupService from './group.service';

export const createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await groupService.createGroup(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listGroups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const groups = await groupService.listGroups(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(groups);
});

export const getGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const group = await groupService.getGroup(
    groupId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(group);
});

export const updateGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const result = await groupService.updateGroup(
    groupId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const result = await groupService.deleteGroup(
    groupId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const alignGroupsToBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const result = await groupService.alignGroupsToBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const removeGroupsFromBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const result = await groupService.removeGroupsFromBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getGroupsByBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const groups = await groupService.getGroupsByBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(groups);
});

