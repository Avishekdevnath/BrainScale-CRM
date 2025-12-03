import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as enrollmentService from './enrollment.service';

export const createEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await enrollmentService.createEnrollment(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const updateEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { enrollmentId } = req.params;
  const result = await enrollmentService.updateEnrollment(
    enrollmentId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getStudentStatuses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const statuses = await enrollmentService.getStudentStatuses(
    studentId,
    req.user!.workspaceId!
  );
  res.json(statuses);
});

export const setStudentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await enrollmentService.setStudentStatus(
    studentId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const updateModuleProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await enrollmentService.updateModuleProgress(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

