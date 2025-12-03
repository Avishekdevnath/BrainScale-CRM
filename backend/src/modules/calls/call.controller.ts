import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as callService from './call.service';

export const createCall = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callService.createCall(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listStudentCalls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const calls = await callService.listStudentCalls(req.user!.workspaceId!, studentId);
  res.json(calls);
});

export const listGroupCalls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const result = await callService.listGroupCalls(
    req.user!.workspaceId!,
    groupId,
    req.user!.sub,
    req.query as any
  );
  res.json(result);
});

export const getCall = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { callId } = req.params;
  const call = await callService.getCall(callId, req.user!.workspaceId!);
  res.json(call);
});

export const updateCall = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { callId } = req.params;
  const result = await callService.updateCall(
    callId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteCall = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { callId } = req.params;
  const result = await callService.deleteCall(
    callId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

