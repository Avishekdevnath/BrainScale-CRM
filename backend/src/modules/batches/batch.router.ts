import { Router } from 'express';
import * as batchController from './batch.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateBatchSchema,
  UpdateBatchSchema,
  ListBatchesSchema,
} from './batch.schemas';

const router = Router();

/**
 * @openapi
 * /batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Batch created
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'create'),
  zodValidator(CreateBatchSchema),
  batchController.createBatch
);

/**
 * @openapi
 * /batches:
 *   get:
 *     summary: List all batches
 *     tags: [Batches]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Paginated list of batches
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'read'),
  zodValidator(ListBatchesSchema, 'query'),
  batchController.listBatches
);

/**
 * @openapi
 * /batches/{batchId}:
 *   get:
 *     summary: Get batch details
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch details
 */
router.get(
  '/:batchId',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'read'),
  batchController.getBatch
);

/**
 * @openapi
 * /batches/{batchId}:
 *   patch:
 *     summary: Update a batch
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Batch updated
 */
router.patch(
  '/:batchId',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'update'),
  zodValidator(UpdateBatchSchema),
  batchController.updateBatch
);

/**
 * @openapi
 * /batches/{batchId}:
 *   delete:
 *     summary: Delete a batch (admins only, soft delete if has data)
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch deleted or deactivated
 */
router.delete(
  '/:batchId',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'delete'),
  batchController.deleteBatch
);

/**
 * @openapi
 * /batches/{batchId}/stats:
 *   get:
 *     summary: Get batch statistics
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch statistics
 */
router.get(
  '/:batchId/stats',
  authGuard,
  tenantGuard,
  requirePermission('batches', 'read'),
  batchController.getBatchStats
);

export default router;

