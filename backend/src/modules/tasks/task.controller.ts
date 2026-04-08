import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as taskService from './task.service';

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await taskService.createTask(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await taskService.listTasks(
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!,
    req.validatedData!
  );
  res.json(result);
});

export const getTaskKpi = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await taskService.getTaskKpi(
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!
  );
  res.json(result);
});

export const getTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.getTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!
  );
  res.json(result);
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.updateTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!,
    req.validatedData!
  );
  res.json(result);
});

export const acceptTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.acceptTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!
  );
  res.json(result);
});

export const startTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.startTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!
  );
  res.json(result);
});

export const declineTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.declineTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.completeTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!,
    req.validatedData!
  );
  res.json(result);
});

export const deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const result = await taskService.deleteTask(
    taskId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.user!.role!
  );
  res.json(result);
});
