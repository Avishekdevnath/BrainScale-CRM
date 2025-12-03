import { Router } from 'express';
import * as groupController from './group.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { CreateGroupSchema, UpdateGroupSchema, AlignGroupsToBatchSchema, ListGroupsSchema } from './group.schemas';

const router = Router();

/**
 * @openapi
 * /groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Group created
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateGroupSchema),
  groupController.createGroup
);

/**
 * @openapi
 * /groups:
 *   get:
 *     summary: List all groups (filtered by user access)
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter groups by batch ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of groups
 */
router.get(
  '/',
  authGuard,
  zodValidator(ListGroupsSchema, 'query'),
  groupController.listGroups
);

/**
 * @openapi
 * /groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details
 */
router.get('/:groupId', authGuard, groupController.getGroup);

/**
 * @openapi
 * /groups/{groupId}:
 *   patch:
 *     summary: Update a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
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
 *               batchId:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Group updated
 */
router.patch(
  '/:groupId',
  authGuard,
  zodValidator(UpdateGroupSchema),
  groupController.updateGroup
);

/**
 * @openapi
 * /groups/{groupId}:
 *   delete:
 *     summary: Delete a group (admins only, soft delete if has data)
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted or deactivated
 */
router.delete('/:groupId', authGuard, groupController.deleteGroup);

export default router;

// Batch-Group Alignment Routes (mounted at /batches/:batchId/groups)
export const batchGroupRouter = Router();

/**
 * @openapi
 * /batches/{batchId}/groups:
 *   get:
 *     summary: Get all groups aligned to a batch
 *     tags: [Batches, Groups]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of groups in the batch
 */
batchGroupRouter.get('/:batchId/groups', authGuard, groupController.getGroupsByBatch);

/**
 * @openapi
 * /batches/{batchId}/groups:
 *   post:
 *     summary: Align multiple groups to a batch (bulk operation)
 *     tags: [Batches, Groups]
 *     parameters:
 *       - in: path
 *         name: batchId
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
 *               - groupIds
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Groups aligned to batch
 */
batchGroupRouter.post(
  '/:batchId/groups',
  authGuard,
  zodValidator(AlignGroupsToBatchSchema),
  groupController.alignGroupsToBatch
);

/**
 * @openapi
 * /batches/{batchId}/groups:
 *   delete:
 *     summary: Remove groups from batch (set batchId to null)
 *     tags: [Batches, Groups]
 *     parameters:
 *       - in: path
 *         name: batchId
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
 *               - groupIds
 *             properties:
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Groups removed from batch
 */
batchGroupRouter.delete(
  '/:batchId/groups',
  authGuard,
  zodValidator(AlignGroupsToBatchSchema),
  groupController.removeGroupsFromBatch
);

