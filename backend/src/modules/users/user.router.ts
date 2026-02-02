import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as userController from './user.controller';

const router = Router();

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
