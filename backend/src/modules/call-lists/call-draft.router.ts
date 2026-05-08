import { Router } from 'express';
import * as callDraftController from './call-draft.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  UpsertCallDraftSchema,
  ListCallDraftsSchema,
  SubmitAllDraftsSchema,
} from './call-draft.schemas';

const router = Router();

/**
 * @openapi
 * /call-drafts:
 *   get:
 *     summary: List current user's call drafts
 *     tags: [Call Drafts]
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(ListCallDraftsSchema, 'query'),
  callDraftController.listDrafts
);

/**
 * @openapi
 * /call-drafts/submit-all:
 *   post:
 *     summary: Submit all current user's drafts as call logs
 *     tags: [Call Drafts]
 */
router.post(
  '/submit-all',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(SubmitAllDraftsSchema),
  callDraftController.submitAllDrafts
);

/**
 * @openapi
 * /call-drafts/{itemId}:
 *   get:
 *     summary: Get current user's draft for a call list item
 *     tags: [Call Drafts]
 */
router.get(
  '/:itemId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  callDraftController.getDraft
);

/**
 * @openapi
 * /call-drafts/{itemId}:
 *   put:
 *     summary: Upsert current user's draft for a call list item
 *     tags: [Call Drafts]
 */
router.put(
  '/:itemId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(UpsertCallDraftSchema),
  callDraftController.upsertDraft
);

/**
 * @openapi
 * /call-drafts/{itemId}:
 *   delete:
 *     summary: Delete current user's draft for a call list item
 *     tags: [Call Drafts]
 */
router.delete(
  '/:itemId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  callDraftController.deleteDraft
);

export default router;
