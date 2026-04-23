import { Router } from 'express';
import * as formsController from './forms.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import { CreateFormSchema, UpdateFormSchema, SubmitResponseSchema } from './forms.schemas';

const router = Router();

// Management routes (workspace-scoped)
router.post(
  '/:workspaceId/forms',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'create'),
  zodValidator(CreateFormSchema),
  formsController.createForm
);

router.get(
  '/:workspaceId/forms',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'read'),
  formsController.listForms
);

router.get(
  '/:workspaceId/forms/check-slug',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'read'),
  formsController.checkSlugAvailability
);

router.get(
  '/:workspaceId/forms/:formId',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'read'),
  formsController.getForm
);

router.patch(
  '/:workspaceId/forms/:formId',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'update'),
  zodValidator(UpdateFormSchema),
  formsController.updateForm
);

router.post(
  '/:workspaceId/forms/:formId/publish',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'update'),
  formsController.publishForm
);

router.post(
  '/:workspaceId/forms/:formId/archive',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'delete'),
  formsController.archiveForm
);

router.get(
  '/:workspaceId/forms/:formId/responses',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'read'),
  formsController.listResponses
);

router.get(
  '/:workspaceId/forms/:formId/responses/export',
  authGuard,
  tenantGuard,
  requirePermission('forms', 'read'),
  formsController.exportResponses
);

export default router;

// Public router for unauthenticated form submission
export const publicFormsRouter = Router();
publicFormsRouter.get('/forms/:slug', formsController.publicGetForm);
publicFormsRouter.post('/forms/:slug/submit', zodValidator(SubmitResponseSchema), formsController.publicSubmit);
