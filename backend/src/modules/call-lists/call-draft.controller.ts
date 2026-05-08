import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as callDraftService from './call-draft.service';

export const upsertDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const result = await callDraftService.upsertDraft(
    itemId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!.payload
  );
  res.json(result);
});

export const getDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const result = await callDraftService.getDraft(
    itemId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const listDrafts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callDraftService.listDrafts(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const result = await callDraftService.deleteDraft(
    itemId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const submitAllDrafts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callDraftService.submitAllDrafts(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});
