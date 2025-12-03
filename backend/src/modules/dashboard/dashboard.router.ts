import { Router } from 'express';
import * as dashboardController from './dashboard.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { DashboardFiltersSchema } from './dashboard.schemas';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Get complete dashboard summary (KPIs, distributions, trends, recent activity)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
router.get(
  '/',
  authGuard,
  zodValidator(DashboardFiltersSchema, 'query'),
  dashboardController.getDashboardSummary
);

/**
 * @openapi
 * /dashboard/kpis:
 *   get:
 *     summary: Get workspace KPIs (key performance indicators)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: KPIs data
 */
router.get(
  '/kpis',
  authGuard,
  zodValidator(DashboardFiltersSchema, 'query'),
  dashboardController.getKPIs
);

/**
 * @openapi
 * /dashboard/calls-by-status:
 *   get:
 *     summary: Get calls distribution by status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Calls by status distribution
 */
router.get(
  '/calls-by-status',
  authGuard,
  zodValidator(DashboardFiltersSchema, 'query'),
  dashboardController.getCallsByStatus
);

/**
 * @openapi
 * /dashboard/followups-by-status:
 *   get:
 *     summary: Get followups distribution by status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Followups by status distribution
 */
router.get(
  '/followups-by-status',
  authGuard,
  zodValidator(DashboardFiltersSchema, 'query'),
  dashboardController.getFollowupsByStatus
);

/**
 * @openapi
 * /dashboard/students-by-group:
 *   get:
 *     summary: Get students distribution by group
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students by group distribution
 */
router.get('/students-by-group', authGuard, dashboardController.getStudentsByGroup);

/**
 * @openapi
 * /dashboard/students-by-batch:
 *   get:
 *     summary: Get students distribution by batch
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students by batch distribution
 */
router.get('/students-by-batch', authGuard, dashboardController.getStudentsByBatch);

/**
 * @openapi
 * /dashboard/calls-trend:
 *   get:
 *     summary: Get calls trend over time
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Calls trend data
 */
router.get('/calls-trend', authGuard, dashboardController.getCallsTrend);

/**
 * @openapi
 * /dashboard/recent-activity:
 *   get:
 *     summary: Get recent activity (calls and followups)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent activity list
 */
router.get('/recent-activity', authGuard, dashboardController.getRecentActivity);

export default router;

