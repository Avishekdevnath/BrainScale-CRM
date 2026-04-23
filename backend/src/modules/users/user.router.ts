import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import { zodValidator } from '../../middleware/validate';
import * as userController from './user.controller';

const router = Router();

const UpdateMyProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
}).refine(
  (d) => d.name !== undefined || d.email !== undefined,
  { message: 'At least one of name or email must be provided' }
);

router.patch('/me', authGuard, zodValidator(UpdateMyProfileSchema), userController.updateMyProfile);

/**
 * @openapi
 * /users/me/export:
 *   get:
 *     summary: Export my account data as XLSX
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: XLSX export
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/me/export', authGuard, userController.exportMyAccount);

/**
 * @openapi
 * /users/me:
 *   delete:
 *     summary: Delete my account (and remove memberships)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/me', authGuard, userController.deleteMyAccount);

export default router;
