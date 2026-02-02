import { Router } from 'express';
import * as roleController from './role.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignPermissionsSchema,
} from './role.schemas';

const router = Router();

/**
 * @openapi
 * /workspaces/available-permissions:
 *   get:
 *     summary: List all available permissions (Admin only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Workspace-Id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of permissions
 *       403:
 *         description: Admin access required
 */
// Permissions listing is restricted to workspace admins
// Using /available-permissions to avoid route conflicts with /:workspaceId/* routes
// tenantGuard gets workspace ID from X-Workspace-Id header
router.get('/available-permissions', authGuard, tenantGuard, requireRole('ADMIN'), roleController.listPermissions);

/**
 * @openapi
 * /workspaces/initialize-permissions:
 *   post:
 *     summary: Initialize default permissions (Admin only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Workspace-Id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Permissions initialized
 *       403:
 *         description: Admin access required
 */
router.post('/initialize-permissions', authGuard, tenantGuard, requireRole('ADMIN'), roleController.initializePermissions);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles:
 *   post:
 *     summary: Create a custom role
 *     tags: [Roles]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 */
router.post(
  '/:workspaceId/roles',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'create'),
  zodValidator(CreateRoleSchema),
  roleController.createRole
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles:
 *   get:
 *     summary: List all custom roles
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get(
  '/:workspaceId/roles',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'read'),
  roleController.listRoles
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/{roleId}:
 *   get:
 *     summary: Get role details
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role details
 */
router.get(
  '/:workspaceId/roles/:roleId',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'read'),
  roleController.getRole
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/{roleId}:
 *   patch:
 *     summary: Update a custom role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch(
  '/:workspaceId/roles/:roleId',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'update'),
  zodValidator(UpdateRoleSchema),
  roleController.updateRole
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/{roleId}:
 *   delete:
 *     summary: Delete a custom role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted
 */
router.delete(
  '/:workspaceId/roles/:roleId',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'delete'),
  roleController.deleteRole
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/{roleId}/permissions:
 *   patch:
 *     summary: Assign permissions to a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
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
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissions assigned
 */
router.patch(
  '/:workspaceId/roles/:roleId/permissions',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'update'),
  zodValidator(AssignPermissionsSchema),
  roleController.assignPermissions
);

/**
 * @openapi
 * /workspaces/{workspaceId}/roles/create-default:
 *   post:
 *     summary: Create Admin and Member custom roles with all permissions
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Default roles created/updated successfully
 */
router.post(
  '/:workspaceId/roles/create-default',
  authGuard,
  tenantGuard,
  requirePermission('roles', 'create'),
  roleController.createDefaultRoles
);

export default router;

