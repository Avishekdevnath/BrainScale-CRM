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

// Per-call-list status options (stored in callList.meta.statusOptions)
export const listCallListStatusOptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await settingsService.listCallListStatusOptions(listId, req.user!.workspaceId!);
  res.json(result);
});

export const addCallListStatusOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { label } = req.body as { label: string };
  if (!label || typeof label !== 'string' || !label.trim()) {
    res.status(400).json({ message: 'label is required' });
    return;
  }
  const result = await settingsService.addCallListStatusOption(listId, req.user!.workspaceId!, label.trim());
  res.status(201).json(result);
});

export const removeCallListStatusOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, value } = req.params;
  const result = await settingsService.removeCallListStatusOption(listId, req.user!.workspaceId!, value);
  res.json(result);
});

// ── Per-call-list custom columns ─────────────────────────────────────────────

export const listCallListColumns = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await settingsService.listCallListColumns(listId, req.user!.workspaceId!);
  res.json(result);
});

export const addCallListColumn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const { label, shortLabel, type, options } = req.body as { label: string; shortLabel?: string; type: string; options?: string[] };
  if (!label?.trim()) { res.status(400).json({ message: 'label is required' }); return; }
  if (!['text', 'number', 'date', 'select'].includes(type)) { res.status(400).json({ message: 'type must be text, number, date, or select' }); return; }
  const result = await settingsService.addCallListColumn(listId, req.user!.workspaceId!, { label: label.trim(), shortLabel, type: type as any, options });
  res.status(201).json(result);
});

export const updateCallListColumn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, key } = req.params;
  const { label, options } = req.body as { label?: string; options?: string[] };
  const result = await settingsService.updateCallListColumn(listId, req.user!.workspaceId!, key, { label, options });
  res.json(result);
});

export const removeCallListColumn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, key } = req.params;
  const result = await settingsService.removeCallListColumn(listId, req.user!.workspaceId!, key);
  res.json(result);
});

export const updateCallListItemCustom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId, itemId } = req.params;
  const fields = req.body as Record<string, any>;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    res.status(400).json({ message: 'body must be a key-value object of custom fields' }); return;
  }
  const result = await settingsService.updateCallListItemCustom(listId, itemId, req.user!.workspaceId!, fields);
  res.json(result);
});
