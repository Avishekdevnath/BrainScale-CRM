import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { zodValidator } from '../../middleware/validate';
import { ListAuditLogsSchema } from './audit-log.schemas';
import * as auditLogController from './audit-log.controller';

const router = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: List audit logs for the workspace
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: size
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - name: userId
 *         in: query
 *         schema: { type: string }
 *         description: Filter by actor user ID
 *       - name: action
 *         in: query
 *         schema: { type: string }
 *         description: Filter by action (substring match)
 *       - name: entity
 *         in: query
 *         schema: { type: string }
 *         description: Filter by entity type
 *       - name: dateFrom
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: dateTo
 *         in: query
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Audit logs list
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  zodValidator(ListAuditLogsSchema, 'query'),
  auditLogController.listAuditLogs
);

export default router;
