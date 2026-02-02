import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as invitationService from './invitation.service';

export const sendInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await invitationService.sendInvitation(
    req.user!.workspaceId!,
    req.user!.sub,
    req.validatedData!
  );
  res.status(201).json(result);
});

export const getInvitationByToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.params;
  const invitation = await invitationService.getInvitationByToken(token);
  res.json(invitation);
});

export const listInvitations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invitations = await invitationService.listInvitations(req.user!.workspaceId!);
  res.json(invitations);
});

export const cancelInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invitationId } = req.params;
  const result = await invitationService.cancelInvitation(
    invitationId,
    req.user!.workspaceId!
  );
  res.json(result);
});

export const resendInvitation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invitationId } = req.params;
  const result = await invitationService.resendInvitation(
    invitationId,
    req.user!.workspaceId!,
    req.user!.sub
  );
  res.json(result);
});

