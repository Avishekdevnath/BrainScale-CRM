import { Router } from 'express';
import { Response, NextFunction } from 'express';
import * as exportController from './export.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { AuthRequest } from '../../middleware/auth-guard';
import { AppError } from '../../middleware/error-handler';
import { ExportDataSchema } from './export.schemas';

const router = Router();

// Dynamic permission check based on export type
const checkExportPermission = (req: AuthRequest, res: Response, next: NextFunction) => {
  const exportType = req.body?.type;
  
  if (!exportType) {
    return next(new AppError(400, 'Export type is required'));
  }
  
  // Map export types to required permissions
  const permissionMap: Record<string, { resource: string; action: string }> = {
    'students': { resource: 'students', action: 'read' },
    'calls': { resource: 'calls', action: 'read' },
    'followups': { resource: 'followups', action: 'read' },
    'call-lists': { resource: 'call_lists', action: 'read' },
    'dashboard': { resource: 'workspace', action: 'read' },
  };
  
  const permission = permissionMap[exportType];
  
  if (!permission) {
    return next(new AppError(400, `Invalid export type: ${exportType}`));
  }
  
  // Use requirePermission middleware logic
  if (!req.user) {
    return next(new AppError(401, 'Authentication required'));
  }
  
  // ADMIN role has full access
  if (req.user.role === 'ADMIN') {
    return next();
  }
  
  // Get user permissions
  const permissions = req.user.permissions || [];
  
  // Check if user has the specific permission
  const hasSpecificPermission = permissions.some(
    (p) => p.resource === permission.resource && p.action === permission.action
  );
  
  if (hasSpecificPermission) {
    return next();
  }
  
  // Check if user has "manage" permission for the resource
  const hasManagePermission = permissions.some(
    (p) => p.resource === permission.resource && p.action === 'manage'
  );
  
  if (hasManagePermission) {
    return next();
  }
  
  // Permission denied
  return next(new AppError(403, `Insufficient permissions. Required: ${permission.resource}:${permission.action}`));
};

/**
 * @openapi
 * /exports:
 *   post:
 *     summary: Export data (students, calls, followups, etc.) as CSV/XLSX/PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - format
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [students, calls, followups, call-lists, dashboard]
 *               format:
 *                 type: string
 *                 enum: [csv, xlsx, pdf]
 *                 default: csv
 *               filters:
 *                 type: object
 *                 properties:
 *                   groupId:
 *                     type: string
 *                   courseId:
 *                     type: string
 *                   status:
 *                     type: string
 *                   dateFrom:
 *                     type: string
 *                     format: date
 *                   dateTo:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Export file generated
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  zodValidator(ExportDataSchema),
  checkExportPermission,
  exportController.exportData
);

export default router;

