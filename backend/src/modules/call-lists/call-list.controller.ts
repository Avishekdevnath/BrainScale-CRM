import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as callListService from './call-list.service';

export const createCallList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callListService.createCallList(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const listCallLists = asyncHandler(async (req: AuthRequest, res: Response) => {
  const options = req.validatedData as any;
  const callLists = await callListService.listCallLists(req.user!.workspaceId!, options);
  res.json(callLists);
});

export const getCallList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const callList = await callListService.getCallList(listId, req.user!.workspaceId!);
  res.json(callList);
});

export const getAvailableStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.getAvailableStudents(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const updateCallList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.updateCallList(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const deleteCallList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.deleteCallList(listId, req.user!.workspaceId!);
  res.json(result);
});

export const addCallListItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.addCallListItems(
    listId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const assignCallListItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.assignCallListItems(
    listId,
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.json(result);
});

export const listCallListItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.listCallListItems(
    listId,
    req.user!.workspaceId!,
    req.query as any
  );
  res.json(result);
});

export const updateCallListItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const result = await callListService.updateCallListItem(
    itemId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const unassignCallListItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.unassignCallListItems(
    listId,
    req.user!.workspaceId!,
    (req.validatedData as any).itemIds
  );
  res.json(result);
});

export const createFromBulkPaste = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callListService.createCallListFromBulkPaste(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const createCallListFromFollowups = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await callListService.createCallListFromFollowups(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const deleteCallListItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const result = await callListService.deleteCallListItem(itemId, req.user!.workspaceId!);
  res.json(result);
});

export const markCallListComplete = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.markCallListComplete(
    listId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

export const markCallListActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { listId } = req.params;
  const result = await callListService.markCallListActive(
    listId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

