import { Router } from 'express';
import * as workspaceController from './workspace.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  InviteMemberSchema,
  UpdateMemberSchema,
  GrantGroupAccessSchema,
  CreateMemberWithAccountSchema,
} from './workspace.schemas';

const router = Router();

/**
 * @openapi
 * /workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Academy
 *               logo:
 *                 type: string
 *                 format: uri
 *               timezone:
 *                 type: string
 *                 example: Asia/Dhaka
 *     responses:
 *       201:
 *         description: Workspace created
 *       403:
 *         description: Plan limit reached
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateWorkspaceSchema),
  workspaceController.create
);

/**
 * @openapi
 * /workspaces:
 *   get:
 *     summary: Get all workspaces for current user
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/', authGuard, workspaceController.list);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   get:
 *     summary: Get workspace details
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 *       404:
 *         description: Workspace not found
 */
router.get(
  '/:workspaceId',
  authGuard,
  tenantGuard,
  requirePermission('workspace', 'read'),
  workspaceController.get
);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   patch:
 *     summary: Update workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               logo:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated
 */
router.patch(
  '/:workspaceId',
  authGuard,
  tenantGuard,
  requirePermission('workspace', 'update'),
  zodValidator(UpdateWorkspaceSchema),
  workspaceController.update
);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   delete:
 *     summary: Delete workspace (admin only)
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:workspaceId',
  authGuard,
  tenantGuard,
  requireRole('ADMIN'),
  workspaceController.remove
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/invite:
 *   post:
 *     summary: Invite a member to workspace
 *     tags: [Workspaces]
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
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Member invited
 */
router.post(
  '/:workspaceId/members/invite',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  zodValidator(InviteMemberSchema),
  workspaceController.invite
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/me:
 *   get:
 *     summary: Get current member with permissions and group access
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current member details with permissions
 *       404:
 *         description: Member not found
 */
router.get('/:workspaceId/members/me', authGuard, tenantGuard, workspaceController.getCurrentMember);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/create:
 *   post:
 *     summary: Create member account with temporary password
 *     tags: [Workspaces]
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
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *                 description: Optional phone number for the member
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *                 description: Legacy role (use either role or customRoleId, not both)
 *               customRoleId:
 *                 type: string
 *                 description: Custom role ID (use either role or customRoleId, not both)
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of group IDs for group-level access
 *     responses:
 *       201:
 *         description: Member account created successfully. Temporary password sent via email. Member must complete setup (change password and accept agreement) before gaining full workspace access.
 *       409:
 *         description: User already exists
 */
router.post(
  '/:workspaceId/members/create',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  zodValidator(CreateMemberWithAccountSchema),
  workspaceController.createMemberWithAccount
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{memberId}/reinvite:
 *   post:
 *     summary: Re-send temporary password email for an existing member (resets password)
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Re-invitation email sent
 *       400:
 *         description: Member already completed setup
 *       404:
 *         description: Member not found
 */
router.post(
  '/:workspaceId/members/:memberId/reinvite',
  authGuard,
  tenantGuard,
  requirePermission('members', 'invite'),
  workspaceController.reinviteMemberWithAccount
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members:
 *   get:
 *     summary: Get all members of workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 */
router.get(
  '/:workspaceId/members',
  authGuard,
  tenantGuard,
  requirePermission('members', 'read'),
  workspaceController.members
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{memberId}:
 *   patch:
 *     summary: Update member role
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *                 description: Legacy role (use either role or customRoleId, not both)
 *               customRoleId:
 *                 type: string
 *                 description: Custom role ID (use either role or customRoleId, not both)
 *     responses:
 *       200:
 *         description: Member updated
 */
router.patch(
  '/:workspaceId/members/:memberId',
  authGuard,
  tenantGuard,
  requirePermission('members', 'update'),
  zodValidator(UpdateMemberSchema),
  workspaceController.updateMember
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{memberId}/groups:
 *   patch:
 *     summary: Grant group access to member
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
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
 *               - groupIds
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Access granted
 */
router.patch(
  '/:workspaceId/members/:memberId/groups',
  authGuard,
  tenantGuard,
  requirePermission('members', 'update'),
  zodValidator(GrantGroupAccessSchema),
  workspaceController.grantGroupAccess
);

/**
 * @openapi
 * /workspaces/{workspaceId}/members/{memberId}:
 *   delete:
 *     summary: Remove member from workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete(
  '/:workspaceId/members/:memberId',
  authGuard,
  tenantGuard,
  requirePermission('members', 'remove'),
  workspaceController.removeMember
);

export default router;

