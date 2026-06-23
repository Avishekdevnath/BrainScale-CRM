import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as questionPresetService from './question-preset.service';

export const createQuestionPreset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await questionPresetService.createQuestionPreset(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listQuestionPresets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await questionPresetService.listQuestionPresets(
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const getQuestionPreset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { presetId } = req.params;
  const result = await questionPresetService.getQuestionPreset(
    req.user!.workspaceId!,
    req.user!.sub,
    presetId
  );
  res.json(result);
});

export const updateQuestionPreset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { presetId } = req.params;
  const result = await questionPresetService.updateQuestionPreset(
    req.user!.workspaceId!,
    req.user!.sub,
    presetId,
    req.validatedData!
  );
  res.json(result);
});

export const deleteQuestionPreset = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { presetId } = req.params;
  const result = await questionPresetService.deleteQuestionPreset(
    req.user!.workspaceId!,
    req.user!.sub,
    presetId
  );
  res.json(result);
});
