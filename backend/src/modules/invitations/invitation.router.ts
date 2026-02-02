import { Router } from 'express';
import * as invitationController from './invitation.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import { SendInvitationSchema } from './invitation.schemas';

const router = Router();

/**
 * @openapi
 * /workspaces/{workspaceId}/invitations:
 *   post:
 *     summary: Send invitation to join workspace
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *               customRoleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent
 *       409:
 *         description: User already member or invitation exists
 */
router.post(
  '/:workspaceId/invitations',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  zodValidator(SendInvitationSchema),
  invitationController.sendInvitation
);

/**
 * @openapi
 * /workspaces/{workspaceId}/invitations:
 *   get:
 *     summary: List all invitations for workspace
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of invitations
 */
router.get(
  '/:workspaceId/invitations',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  invitationController.listInvitations
);

/**
 * @openapi
 * /workspaces/{workspaceId}/invitations/{invitationId}/resend:
 *   post:
 *     summary: Resend an invitation email (reinvite)
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation resent
 *       404:
 *         description: Invitation not found
 */
router.post(
  '/:workspaceId/invitations/:invitationId/resend',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  invitationController.resendInvitation
);

export default router;

// Separate router for public invitation endpoint (no auth required)
export const publicInvitationRouter = Router();

/**
 * @openapi
 * /invitations/{token}:
 *   get:
 *     summary: Get invitation details by token
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation details
 *       404:
 *         description: Invitation not found
 */
publicInvitationRouter.get('/invitations/:token', invitationController.getInvitationByToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/invitations/{invitationId}:
 *   delete:
 *     summary: Cancel an invitation
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation cancelled
 */
router.delete(
  '/:workspaceId/invitations/:invitationId',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  invitationController.cancelInvitation
);

