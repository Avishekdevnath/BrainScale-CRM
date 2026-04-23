import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import * as scheduleController from './schedule.controller';

const router = Router();

router.get('/template', authGuard, tenantGuard, scheduleController.getTemplate);
router.put('/template', authGuard, tenantGuard, scheduleController.saveTemplate);
router.patch('/template/:templateId/bulk', authGuard, tenantGuard, scheduleController.bulkUpdate);
router.post('/broadcast', authGuard, tenantGuard, scheduleController.broadcastSchedule);
router.post('/sync-tasks', authGuard, tenantGuard, scheduleController.triggerManualSyncCron);
router.get('/exceptions', authGuard, tenantGuard, scheduleController.listExceptions);
router.post('/exceptions', authGuard, tenantGuard, scheduleController.createException);
router.delete('/exceptions/:id', authGuard, tenantGuard, scheduleController.deleteException);

export default router;
