import { Router } from 'express';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import {
  cancelEmail,
  getEmailDetails,
  getEmailLogs,
  getPendingEmails,
  getQueueStatus,
  processQueueNow,
  retryEmail,
} from './email-queue.controller';

const router = Router();

router.get('/status', authGuard, requireRole('ADMIN'), getQueueStatus);
router.get('/pending', authGuard, requireRole('ADMIN'), getPendingEmails);
router.get('/logs', authGuard, requireRole('ADMIN'), getEmailLogs);
router.get('/:queueId', authGuard, requireRole('ADMIN'), getEmailDetails);
router.post('/:queueId/retry', authGuard, requireRole('ADMIN'), retryEmail);
router.delete('/:queueId', authGuard, requireRole('ADMIN'), cancelEmail);
router.post('/process', authGuard, requireRole('ADMIN'), processQueueNow);

export default router;
