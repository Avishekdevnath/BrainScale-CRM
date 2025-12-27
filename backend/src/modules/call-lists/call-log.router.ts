import { Router } from 'express';
import * as callLogController from './call-log.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { tenantGuard } from '../../middleware/tenant-guard';
import { requirePermission } from '../../middleware/permission-guard';
import {
  CreateCallLogSchema,
  UpdateCallLogSchema,
  ListCallLogsSchema,
} from './call-log.schemas';
import { CreateFollowupCallLogSchema } from '../followups/followup.schemas';

const router = Router();

/**
 * @openapi
 * /call-logs:
 *   post:
 *     summary: Create a call log
 *     tags: [Call Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callListItemId
 *               - status
 *             properties:
 *               callListItemId:
 *                 type: string
 *               callDuration:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [completed, missed, busy, no_answer, voicemail, other]
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Optional - Array of answers for call list questions
 *               notes:
 *                 type: string
 *               callerNote:
 *                 type: string
 *                 description: Caller's manual notes (separate from AI-generated summary)
 *               followUpDate:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Call log created
 */
router.post(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(CreateCallLogSchema),
  callLogController.createCallLog
);

/**
 * @openapi
 * /call-logs:
 *   get:
 *     summary: List call logs
 *     tags: [Call Logs]
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
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: callListId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of call logs
 */
router.get(
  '/',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  zodValidator(ListCallLogsSchema, 'query'),
  callLogController.listCallLogs
);

/**
 * @openapi
 * /call-logs/followup:
 *   post:
 *     summary: Create a call log for a follow-up call
 *     tags: [Call Logs]
 *     description: Creates a call log for a follow-up call. Uses same questions as original call list, allows adding answers to same questions.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followupId
 *               - status
 *               - answers
 *             properties:
 *               followupId:
 *                 type: string
 *               callDuration:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [completed, missed, busy, no_answer, voicemail, other]
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of answers for call list questions
 *               notes:
 *                 type: string
 *               callerNote:
 *                 type: string
 *                 description: Caller's manual notes (separate from AI-generated summary)
 *               followUpDate:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Follow-up call log created
 */
router.post(
  '/followup',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'create'),
  zodValidator(CreateFollowupCallLogSchema),
  callLogController.createFollowupCallLog
);

/**
 * @openapi
 * /call-logs/{logId}:
 *   get:
 *     summary: Get call log details
 *     tags: [Call Logs]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call log details
 */
router.get(
  '/:logId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  callLogController.getCallLog
);

/**
 * @openapi
 * /call-logs/{logId}:
 *   patch:
 *     summary: Update a call log
 *     tags: [Call Logs]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callDuration:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [completed, missed, busy, no_answer, voicemail, other]
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *               notes:
 *                 type: string
 *               callerNote:
 *                 type: string
 *                 description: Caller's manual notes (separate from AI-generated summary)
 *               followUpDate:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Call log updated
 */
router.patch(
  '/:logId',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'update'),
  zodValidator(UpdateCallLogSchema),
  callLogController.updateCallLog
);

/**
 * @openapi
 * /students/{studentId}/call-logs:
 *   get:
 *     summary: Get student call logs
 *     tags: [Call Logs]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *       - in: query
 *         name: callListId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student call logs
 */
router.get(
  '/students/:studentId/call-logs',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  zodValidator(ListCallLogsSchema, 'query'),
  callLogController.getStudentCallLogs
);

/**
 * @openapi
 * /call-lists/{callListId}/call-logs:
 *   get:
 *     summary: Get call list call logs
 *     tags: [Call Logs]
 *     parameters:
 *       - in: path
 *         name: callListId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call list call logs
 */
router.get(
  '/call-lists/:callListId/call-logs',
  authGuard,
  tenantGuard,
  requirePermission('calls', 'read'),
  zodValidator(ListCallLogsSchema, 'query'),
  callLogController.getCallListCallLogs
);

export default router;

