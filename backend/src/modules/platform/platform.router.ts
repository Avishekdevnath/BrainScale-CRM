import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { requireSuperAdmin } from '../../middleware/super-admin-guard';
import { apiLimiter } from '../../middleware/rate-limit';
import { zodValidator } from '../../middleware/validate';
import * as ctrl from './platform.controller';
import {
  ListWorkspacesQuery,
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
  AddMemberBody,
  ChangeMemberRoleBody,
  ListUsersQuery,
  SetSuperAdminBody,
  SetUserStatusBody,
} from './platform.schemas';

const router = Router();

// All platform routes require auth + super-admin + standard API rate limiting.
router.use(authGuard, requireSuperAdmin, apiLimiter);

router.get('/overview', ctrl.overview);
router.get('/workspaces', zodValidator(ListWorkspacesQuery, 'query'), ctrl.listWorkspaces);
router.post('/workspaces', zodValidator(CreateWorkspaceBody), ctrl.createWorkspace);
router.get('/workspaces/:id', ctrl.getWorkspace);
router.patch('/workspaces/:id', zodValidator(UpdateWorkspaceBody), ctrl.updateWorkspace);
router.delete('/workspaces/:id', ctrl.deleteWorkspace);
router.get('/workspaces/:id/members', ctrl.listMembers);
router.post('/workspaces/:id/members', zodValidator(AddMemberBody), ctrl.addMember);
router.patch('/members/:memberId', zodValidator(ChangeMemberRoleBody), ctrl.changeMemberRole);

router.get('/users', zodValidator(ListUsersQuery, 'query'), ctrl.listUsers);
router.patch('/users/:id/super-admin', zodValidator(SetSuperAdminBody), ctrl.setSuperAdmin);
router.patch('/users/:id/status', zodValidator(SetUserStatusBody), ctrl.setUserStatus);
router.post('/users/:id/reset-password', ctrl.resetUserPassword);

export default router;
