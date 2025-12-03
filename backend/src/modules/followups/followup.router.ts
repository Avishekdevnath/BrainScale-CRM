import { Router } from 'express';
import * as followupController from './followup.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { CreateFollowupSchema, UpdateFollowupSchema, ListFollowupsSchema } from './followup.schemas';

const router = Router();

/**
 * @openapi
 * /followups:
 *   post:
 *     summary: Create a follow-up (sends immediate email)
 *     tags: [Follow-ups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - groupId
 *               - dueAt
 *             properties:
 *               studentId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Follow-up created
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateFollowupSchema),
  followupController.createFollowup
);

/**
 * @openapi
 * /followups:
 *   get:
 *     summary: List follow-ups at workspace level
 *     tags: [Follow-ups]
 *     description: Lists follow-ups at workspace level with optional filters. Supports filtering by callListId, status, assignedTo, groupId, and date range.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, DONE, SKIPPED]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: callListId
 *         schema:
 *           type: string
 *         description: Filter by call list ID
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         description: Filter by group ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated list of follow-ups
 */
router.get(
  '/',
  authGuard,
  zodValidator(ListFollowupsSchema, 'query'),
  followupController.listFollowups
);

/**
 * @openapi
 * /followups/{followupId}/call-context:
 *   get:
 *     summary: Get follow-up call context with questions and previous call log
 *     tags: [Follow-ups]
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow-up call context with questions and previous answers
 */
router.get(
  '/:followupId/call-context',
  authGuard,
  followupController.getFollowupCallContext
);

/**
 * @openapi
 * /followups/{followupId}:
 *   get:
 *     summary: Get follow-up details
 *     tags: [Follow-ups]
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow-up details
 */
router.get(
  '/:followupId',
  authGuard,
  followupController.getFollowup
);

/**
 * @openapi
 * /followups/{followupId}:
 *   patch:
 *     summary: Update follow-up status/notes/assignee
 *     tags: [Follow-ups]
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedTo:
 *                 type: string
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [PENDING, DONE, SKIPPED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Follow-up updated
 */
router.patch(
  '/:followupId',
  authGuard,
  zodValidator(UpdateFollowupSchema),
  followupController.updateFollowup
);

/**
 * @openapi
 * /followups/{followupId}:
 *   delete:
 *     summary: Delete a follow-up
 *     tags: [Follow-ups]
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow-up deleted
 */
router.delete(
  '/:followupId',
  authGuard,
  followupController.deleteFollowup
);

export default router;

// Separate router for nested routes
export const groupFollowupRouter = Router();
groupFollowupRouter.get(
  '/:groupId/followups',
  authGuard,
  followupController.listGroupFollowups
);

