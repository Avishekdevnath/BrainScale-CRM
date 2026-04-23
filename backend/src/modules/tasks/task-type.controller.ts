import { Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { AuthRequest } from '../../middleware/auth-guard';
import * as taskTypeService from './task-type.service';

export const listTaskTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await taskTypeService.listTaskTypes(req.user!.workspaceId!);
  res.json(data);
});

export const createTaskType = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await taskTypeService.createTaskType(req.user!.workspaceId!, req.body);
  res.status(201).json(data);
});

export const updateTaskType = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await taskTypeService.updateTaskType(req.params.typeId, req.user!.workspaceId!, req.body);
  res.json(data);
});

export const deleteTaskType = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await taskTypeService.deleteTaskType(req.params.typeId, req.user!.workspaceId!);
  res.json(data);
});
