import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { requireSuperAdmin } from '../../middleware/super-admin-guard';
import { apiLimiter } from '../../middleware/rate-limit';
import { zodValidator } from '../../middleware/validate';
import * as ctrl from './platform.controller';
import * as featuresCtrl from './platform-features.controller';
import { PatchFeatureBody, ListFeatureWorkspacesQuery } from './platform-features.schemas';
import {
  ListWorkspacesQuery,
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
  AddMemberBody,
  ChangeMemberRoleBody,
  ListUsersQuery,
  SetSuperAdminBody,
  SetUserStatusBody,
  ListAuditQuery,
  UpdateUserBody,
  ListFeedbackQuery,
  ReplyFeedbackBody,
  SetFeedbackStatusBody,
} from './platform.schemas';

const router = Router();

// All platform routes require auth + super-admin + standard API rate limiting.
router.use(authGuard, requireSuperAdmin, apiLimiter);

router.get('/overview', ctrl.overview);
router.get('/workspaces', zodValidator(ListWorkspacesQuery, 'query'), ctrl.listWorkspaces);
router.get('/deleted-workspaces', ctrl.listDeletedWorkspaces);
router.post('/workspaces', zodValidator(CreateWorkspaceBody), ctrl.createWorkspace);
router.get('/workspaces/:id', ctrl.getWorkspace);
router.post('/workspaces/:id/restore', ctrl.restoreWorkspace);
router.patch('/workspaces/:id', zodValidator(UpdateWorkspaceBody), ctrl.updateWorkspace);
router.delete('/workspaces/:id', ctrl.deleteWorkspace);
router.get('/workspaces/:id/members', ctrl.listMembers);
router.post('/workspaces/:id/members', zodValidator(AddMemberBody), ctrl.addMember);
router.patch('/members/:memberId', zodValidator(ChangeMemberRoleBody), ctrl.changeMemberRole);

router.get('/users', zodValidator(ListUsersQuery, 'query'), ctrl.listUsers);
router.patch('/users/:id/super-admin', zodValidator(SetSuperAdminBody), ctrl.setSuperAdmin);
router.patch('/users/:id/status', zodValidator(SetUserStatusBody), ctrl.setUserStatus);
router.post('/users/:id/reset-password', ctrl.resetUserPassword);

router.get('/audit', zodValidator(ListAuditQuery, 'query'), ctrl.listAudit);

router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', zodValidator(UpdateUserBody), ctrl.updateUser);

router.get('/feedback', zodValidator(ListFeedbackQuery, 'query'), ctrl.listFeedback);
router.patch('/feedback/:id/reply', zodValidator(ReplyFeedbackBody), ctrl.replyFeedback);
router.patch('/feedback/:id/status', zodValidator(SetFeedbackStatusBody), ctrl.setFeedbackStatus);

router.get('/features', featuresCtrl.getFeatures);
router.patch('/features', zodValidator(PatchFeatureBody), featuresCtrl.patchFeature);
router.get('/features/workspaces', zodValidator(ListFeatureWorkspacesQuery, 'query'), featuresCtrl.listFeatureWorkspaces);

export default router;
