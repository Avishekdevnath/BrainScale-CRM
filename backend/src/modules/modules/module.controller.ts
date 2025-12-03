import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as moduleService from './module.service';

export const createModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await moduleService.createModule(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listCourseModules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.params;
  const modules = await moduleService.listCourseModules(
    courseId,
    req.user!.workspaceId!
  );
  res.json(modules);
});

export const getModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const module = await moduleService.getModule(moduleId, req.user!.workspaceId!);
  res.json(module);
});

export const updateModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const result = await moduleService.updateModule(
    moduleId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteModule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { moduleId } = req.params;
  const result = await moduleService.deleteModule(moduleId, req.user!.workspaceId!, req.user!.sub);
  res.json(result);
});

