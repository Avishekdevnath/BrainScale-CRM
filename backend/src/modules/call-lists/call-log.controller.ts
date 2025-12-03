import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as callLogService from './call-log.service';

export const createCallLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callLogService.createCallLog(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const updateCallLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { logId } = req.params;
  const result = await callLogService.updateCallLog(
    logId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getCallLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { logId } = req.params;
  const result = await callLogService.getCallLog(logId, req.user!.workspaceId!);
  res.json(result);
});

export const listCallLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callLogService.listCallLogs(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const getStudentCallLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const result = await callLogService.getStudentCallLogs(
    studentId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const getCallListCallLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { callListId } = req.params;
  const result = await callLogService.getCallListCallLogs(
    callListId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const createFollowupCallLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callLogService.createFollowupCallLog(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

