import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as myCallsService from './my-calls.service';

export const getMyCalls = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await myCallsService.getMyCalls(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getMyCallsStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await myCallsService.getMyCallsStats(
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

