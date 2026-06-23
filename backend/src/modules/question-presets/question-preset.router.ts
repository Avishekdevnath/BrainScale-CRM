import { Router } from 'express';
import * as questionPresetController from './question-preset.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import { CreateQuestionPresetSchema, UpdateQuestionPresetSchema } from './question-preset.schemas';

const router = Router();

router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'create'),
  zodValidator(CreateQuestionPresetSchema),
  questionPresetController.createQuestionPreset
);

router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'read'),
  questionPresetController.listQuestionPresets
);

router.get(
  '/:presetId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'read'),
  questionPresetController.getQuestionPreset
);

router.patch(
  '/:presetId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'update'),
  zodValidator(UpdateQuestionPresetSchema),
  questionPresetController.updateQuestionPreset
);

router.delete(
  '/:presetId',
  authGuard,
  tenantGuard,
  requirePermission('call_lists', 'delete'),
  questionPresetController.deleteQuestionPreset
);

export default router;
