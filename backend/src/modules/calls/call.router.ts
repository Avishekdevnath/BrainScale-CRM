import { Router } from 'express';
import * as callController from './call.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import { CreateCallSchema, UpdateCallSchema, ListCallsSchema } from './call.schemas';

const router = Router();

/**
 * @openapi
 * /calls:
 *   post:
 *     summary: Log a call
 *     tags: [Calls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - groupId
 *               - callStatus
 *             properties:
 *               studentId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               callStatus:
 *                 type: string
 *               callDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Call created
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(CreateCallSchema),
  callController.createCall
);

/**
 * @openapi
 * /calls/{callId}:
 *   get:
 *     summary: Get call details
 *     tags: [Calls]
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call details
 */
router.get(
  '/:callId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  callController.getCall
);

/**
 * @openapi
 * /calls/{callId}:
 *   patch:
 *     summary: Update a call
 *     tags: [Calls]
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callStatus:
 *                 type: string
 *               callDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call updated
 */
router.patch(
  '/:callId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'update'),
  zodValidator(UpdateCallSchema),
  callController.updateCall
);

/**
 * @openapi
 * /calls/{callId}:
 *   delete:
 *     summary: Delete a call
 *     tags: [Calls]
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call deleted
 */
router.delete(
  '/:callId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'delete'),
  callController.deleteCall
);

export default router;

// Separate routers for nested routes (will be mounted in students/groups routers later)
export const studentCallRouter = Router();
studentCallRouter.get(
  '/:studentId/calls',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  callController.listStudentCalls
);

export const groupCallRouter = Router();
groupCallRouter.get(
  '/:groupId/calls',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  callController.listGroupCalls
);

