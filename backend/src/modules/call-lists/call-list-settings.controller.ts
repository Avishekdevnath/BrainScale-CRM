import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as settingsService from './call-list-settings.service';

export const listStatusOptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await settingsService.listCallStatusOptions(req.user!.workspaceId!);
  res.json(result);
});

export const createStatusOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await settingsService.createCallStatusOption(req.user!.workspaceId!, req.validatedData!);
  res.status(201).json(result);
});

export const updateStatusOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { optionId } = req.params;
  const result = await settingsService.updateCallStatusOption(optionId, req.user!.workspaceId!, req.validatedData!);
  res.json(result);
});

export const deleteStatusOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { optionId } = req.params;
  const result = await settingsService.deleteCallStatusOption(optionId, req.user!.workspaceId!);
  res.json(result);
});
