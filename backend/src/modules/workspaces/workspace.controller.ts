import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import * as workspaceService from './workspace.service';
import { asyncHandler } from '../../middleware/error-handler';

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspace = await workspaceService.createWorkspace(
    req.user!.sub,
    req.validatedData
  );
  res.status(201).json(workspace);
});

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaces = await workspaceService.getWorkspaces(req.user!.sub);
  res.json(workspaces);
});

export const get = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspace = await workspaceService.getWorkspace(
    req.params.workspaceId,
    req.user!.sub
  );
  res.json(workspace);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspace = await workspaceService.updateWorkspace(
    req.params.workspaceId,
    req.validatedData
  );
  res.json(workspace);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await workspaceService.deleteWorkspace(req.params.workspaceId);
  res.json(result);
});

export const invite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const member = await workspaceService.inviteMember(
    req.params.workspaceId,
    req.validatedData
  );
  res.status(201).json(member);
});

export const members = asyncHandler(async (req: AuthRequest, res: Response) => {
  const members = await workspaceService.getMembers(req.params.workspaceId);
  res.json(members);
});

export const updateMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const member = await workspaceService.updateMember(
    req.params.memberId,
    req.validatedData
  );
  res.json(member);
});

export const grantGroupAccess = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await workspaceService.grantGroupAccess(
    req.params.memberId,
    req.validatedData
  );
  res.json(result);
});

export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await workspaceService.removeMember(req.params.memberId);
  res.json(result);
});

export const createMemberWithAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await workspaceService.createMemberWithAccount(
    req.params.workspaceId,
    req.validatedData
  );
  res.status(201).json(result);
});

export const getCurrentMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const member = await workspaceService.getCurrentMember(
    req.params.workspaceId,
    req.user!.sub
  );
  res.json(member);
});

