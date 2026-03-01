import { Router } from 'express';
import * as notificationController from './notification.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { ListNotificationsSchema, UpdatePreferencesSchema } from './notification.schemas';

const router = Router();

// GET /notifications — list paginated notifications
router.get(
  '/',
  authGuard,
  tenantGuard,
  zodValidator(ListNotificationsSchema, 'query'),
  notificationController.listNotifications
);

// GET /notifications/count — unread badge count (polled every 30s)
router.get(
  '/count',
  authGuard,
  tenantGuard,
  notificationController.getUnreadCount
);

// GET /notifications/preferences — user preferences
router.get(
  '/preferences',
  authGuard,
  tenantGuard,
  notificationController.getPreferences
);

// PUT /notifications/preferences — update preferences
router.put(
  '/preferences',
  authGuard,
  tenantGuard,
  zodValidator(UpdatePreferencesSchema),
  notificationController.updatePreferences
);

// PATCH /notifications/read-all — must be before /:id/read to avoid param capture
router.patch(
  '/read-all',
  authGuard,
  tenantGuard,
  notificationController.markAllAsRead
);

// PATCH /notifications/:id/read — mark single as read
router.patch(
  '/:id/read',
  authGuard,
  tenantGuard,
  notificationController.markAsRead
);

// DELETE /notifications/:id — delete single
router.delete(
  '/:id',
  authGuard,
  tenantGuard,
  notificationController.deleteNotification
);

export default router;
