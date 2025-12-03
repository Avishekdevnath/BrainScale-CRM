import { Router } from 'express';
import * as roleController from './role.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignPermissionsSchema,
} from './role.schemas';

const router = Router();

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
  requireRole('ADMIN'),
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
  requireRole('ADMIN'),
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
  requireRole('ADMIN'),
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
  requireRole('ADMIN'),
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
  requireRole('ADMIN'),
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
  requireRole('ADMIN'),
  zodValidator(AssignPermissionsSchema),
  roleController.assignPermissions
);

/**
 * @openapi
 * /permissions:
 *   get:
 *     summary: List all available permissions
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/permissions', authGuard, roleController.listPermissions);

export default router;

