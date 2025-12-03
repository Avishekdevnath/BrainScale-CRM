import { Router } from 'express';
import * as exportController from './export.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { ExportDataSchema } from './export.schemas';

const router = Router();

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
  requireRole('ADMIN'),
  zodValidator(ExportDataSchema),
  exportController.exportData
);

export default router;

