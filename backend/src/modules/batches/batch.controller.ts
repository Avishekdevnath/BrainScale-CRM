import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as batchService from './batch.service';

export const createBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await batchService.createBatch(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listBatches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await batchService.listBatches(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const getBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const batch = await batchService.getBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(batch);
});

export const updateBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const result = await batchService.updateBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const result = await batchService.deleteBatch(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const getBatchStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { batchId } = req.params;
  const stats = await batchService.getBatchStats(
    batchId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(stats);
});

