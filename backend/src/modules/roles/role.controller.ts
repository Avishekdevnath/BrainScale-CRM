import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as roleService from './role.service';

export const createRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const workspaceId = req.user?.workspaceId;
  if (!workspaceId) {
    throw new Error('Workspace ID is required. tenantGuard should have set req.user.workspaceId');
  }
  console.log('[createRole] Creating role for workspace:', workspaceId);
  const result = await roleService.createRole(workspaceId, req.validatedData!);
  res.status(201).json(result);
});

export const listRoles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const roles = await roleService.listRoles(req.user!.workspaceId!);
  res.json(roles);
});

export const getRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { roleId } = req.params;
  const role = await roleService.getRole(roleId, req.user!.workspaceId!);
  res.json(role);
});

export const updateRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { roleId } = req.params;
  const result = await roleService.updateRole(roleId, req.user!.workspaceId!, req.validatedData!);
  res.json(result);
});

export const deleteRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { roleId } = req.params;
  const result = await roleService.deleteRole(roleId, req.user!.workspaceId!);
  res.json(result);
});

export const assignPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { roleId } = req.params;
  const result = await roleService.assignPermissions(
    roleId,
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const listPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const permissions = await roleService.listPermissions();
  console.log(`[listPermissions] Returning ${permissions.length} permissions`);
  res.json(permissions);
});

export const initializePermissions = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await roleService.initializeDefaultPermissions();
  res.status(201).json(result);
});

export const createDefaultRoles = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await roleService.createDefaultRolesWithAllPermissions(req.user!.workspaceId!);
  res.status(201).json(result);
});

