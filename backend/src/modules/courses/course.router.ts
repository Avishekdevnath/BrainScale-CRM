import { Router } from 'express';
import * as courseController from './course.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { CreateCourseSchema, UpdateCourseSchema } from './course.schemas';

const router = Router();

/**
 * @openapi
 * /courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Course created
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateCourseSchema),
  courseController.createCourse
);

/**
 * @openapi
 * /courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses
 */
router.get('/', authGuard, courseController.listCourses);

/**
 * @openapi
 * /courses/{courseId}:
 *   get:
 *     summary: Get course details with modules
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 */
router.get('/:courseId', authGuard, courseController.getCourse);

/**
 * @openapi
 * /courses/{courseId}:
 *   patch:
 *     summary: Update a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated
 */
router.patch(
  '/:courseId',
  authGuard,
  zodValidator(UpdateCourseSchema),
  courseController.updateCourse
);

/**
 * @openapi
 * /courses/{courseId}:
 *   delete:
 *     summary: Delete a course (soft delete if has data)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted or deactivated
 */
router.delete('/:courseId', authGuard, courseController.deleteCourse);

export default router;

