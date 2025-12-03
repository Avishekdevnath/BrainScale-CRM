import { Router } from 'express';
import * as moduleController from './module.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import { CreateModuleSchema, UpdateModuleSchema } from './module.schemas';

const router = Router();

/**
 * @openapi
 * /modules:
 *   post:
 *     summary: Create a new module
 *     tags: [Modules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - name
 *             properties:
 *               courseId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Module created
 */
router.post(
  '/',
  authGuard,
  zodValidator(CreateModuleSchema),
  moduleController.createModule
);

/**
 * @openapi
 * /modules/{moduleId}:
 *   get:
 *     summary: Get module details
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module details
 */
router.get('/:moduleId', authGuard, moduleController.getModule);

/**
 * @openapi
 * /modules/{moduleId}:
 *   patch:
 *     summary: Update a module
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: moduleId
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
 *               orderIndex:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Module updated
 */
router.patch(
  '/:moduleId',
  authGuard,
  zodValidator(UpdateModuleSchema),
  moduleController.updateModule
);

/**
 * @openapi
 * /modules/{moduleId}:
 *   delete:
 *     summary: Delete a module (soft delete if has data)
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module deleted or deactivated
 */
router.delete('/:moduleId', authGuard, moduleController.deleteModule);

export default router;

// Separate router for nested routes under courses
export const courseModuleRouter = Router();

/**
 * @openapi
 * /courses/{courseId}/modules:
 *   get:
 *     summary: List all modules for a course
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of modules
 */
courseModuleRouter.get(
  '/:courseId/modules',
  authGuard,
  moduleController.listCourseModules
);

