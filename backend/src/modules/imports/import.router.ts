import { Router } from 'express';
import * as importController from './import.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard, requireRole } from '../../middleware/auth-guard';
import { uploadLimiter } from '../../middleware/rate-limit';
import { upload } from '../../utils/upload';
import { CommitImportSchema } from './import.schemas';

const router = Router();

/**
 * @openapi
 * /imports/preview:
 *   post:
 *     summary: Upload CSV/XLSX file and preview (parse + suggest column mapping)
 *     tags: [Imports]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File parsed and preview generated
 */
router.post(
  '/preview',
  authGuard,
  requireRole('ADMIN'),
  uploadLimiter,
  upload.single('file'),
  importController.previewImport
);

/**
 * @openapi
 * /imports/{importId}/commit:
 *   post:
 *     summary: Commit import (create students from preview)
 *     tags: [Imports]
 *     parameters:
 *       - in: path
 *         name: importId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnMapping
 *               - groupId
 *             properties:
 *               columnMapping:
 *                 type: object
 *                 description: Map CSV columns to student fields
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   name: column1
 *                   email: column2
 *                   phone: column3
 *               groupId:
 *                 type: string
 *               batchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional array of batch IDs to assign imported students to
 *               skipDuplicates:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Import committed
 */
router.post(
  '/:importId/commit',
  authGuard,
  requireRole('ADMIN'),
  zodValidator(CommitImportSchema),
  importController.commitImport
);

/**
 * @openapi
 * /imports:
 *   get:
 *     summary: List import history
 *     tags: [Imports]
 *     responses:
 *       200:
 *         description: List of imports
 */
router.get(
  '/',
  authGuard,
  requireRole('ADMIN'),
  importController.listImports
);

/**
 * @openapi
 * /imports/{importId}:
 *   get:
 *     summary: Get import details
 *     tags: [Imports]
 *     parameters:
 *       - in: path
 *         name: importId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import details
 */
router.get(
  '/:importId',
  authGuard,
  requireRole('ADMIN'),
  importController.getImport
);

export default router;

