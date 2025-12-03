import { Router } from 'express';
import * as myCallsController from './my-calls.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { GetMyCallsSchema } from './call-list.schemas';
import { ListCallLogsSchema as CallLogListSchema } from './call-log.schemas';
import * as callLogController from './call-log.controller';

const router = Router();

/**
 * @openapi
 * /my-calls:
 *   get:
 *     summary: Get my assigned calls
 *     description: Returns call list items assigned to the current user
 *     tags: [My Calls]
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
 *         name: batchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: callListId
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [QUEUED, CALLING, DONE, SKIPPED]
 *     responses:
 *       200:
 *         description: Paginated list of assigned calls
 */
router.get(
  '/',
  authGuard,
  zodValidator(GetMyCallsSchema, 'query'),
  myCallsController.getMyCalls
);

/**
 * @openapi
 * /my-calls/stats:
 *   get:
 *     summary: Get my calls statistics
 *     tags: [My Calls]
 *     responses:
 *       200:
 *         description: Call statistics
 */
router.get('/stats', authGuard, myCallsController.getMyCallsStats);

/**
 * @openapi
 * /my-calls/history:
 *   get:
 *     summary: Get my call history
 *     description: Returns all call logs created by the current user
 *     tags: [My Calls]
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
 *         description: Paginated list of call logs
 */
router.get(
  '/history',
  authGuard,
  zodValidator(CallLogListSchema, 'query'),
  async (req, res, next) => {
    // Filter to current user's calls
    const member = await require('../../db/client').prisma.workspaceMember.findFirst({
      where: {
        userId: (req as any).user!.sub,
        workspaceId: (req as any).user!.workspaceId!,
      },
    });
    if (member) {
      (req as any).validatedData = {
        ...(req as any).validatedData,
        assignedTo: member.id,
      };
    }
    next();
  },
  callLogController.listCallLogs
);

export default router;

