import { Router } from 'express';
import * as enrollmentController from './enrollment.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import {
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  SetStudentStatusSchema,
  UpdateModuleProgressSchema,
} from './enrollment.schemas';

const router = Router();

/**
 * @openapi
 * /enrollments:
 *   post:
 *     summary: Create enrollment (link student to group/course/module)
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - groupId
 *             properties:
 *               studentId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               moduleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Enrollment created
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateEnrollmentSchema),
  enrollmentController.createEnrollment
);

/**
 * @openapi
 * /enrollments/{enrollmentId}:
 *   patch:
 *     summary: Update enrollment
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Enrollment updated
 */
router.patch(
  '/:enrollmentId',
  authGuard,
  zodValidator(UpdateEnrollmentSchema),
  enrollmentController.updateEnrollment
);

export default router;

// Separate routers for nested routes
export const studentStatusRouter = Router();

/**
 * @openapi
 * /students/{studentId}/status:
 *   get:
 *     summary: Get student statuses per group
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of statuses
 */
studentStatusRouter.get(
  '/:studentId/status',
  authGuard,
  enrollmentController.getStudentStatuses
);

/**
 * @openapi
 * /students/{studentId}/status:
 *   patch:
 *     summary: Set student status for a group
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *               - groupId
 *               - status
 *             properties:
 *               groupId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [NEW, IN_PROGRESS, FOLLOW_UP, CONVERTED, LOST]
 *     responses:
 *       200:
 *         description: Status updated
 */
studentStatusRouter.patch(
  '/:studentId/status',
  authGuard,
  zodValidator(SetStudentStatusSchema),
  enrollmentController.setStudentStatus
);

// Router for module progress
export const progressRouter = Router();

/**
 * @openapi
 * /progress/module:
 *   patch:
 *     summary: Update module progress
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - moduleId
 *             properties:
 *               studentId:
 *                 type: string
 *               moduleId:
 *                 type: string
 *               isCompleted:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Progress updated
 */
progressRouter.patch(
  '/module',
  authGuard,
  zodValidator(UpdateModuleProgressSchema),
  enrollmentController.updateModuleProgress
);

