import { Router } from 'express';
import * as revenueController from './revenue.controller';
import { zodValidator } from '../../middleware/validate';
import { authGuard } from '../../middleware/auth-guard';
import {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  ListPaymentsSchema,
  RevenueStatsSchema,
} from './revenue.schemas';

const router = Router();

/**
 * @openapi
 * /revenue/payments:
 *   post:
 *     summary: Create a payment record
 *     tags: [Revenue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - groupId
 *               - amount
 *             properties:
 *               studentId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               batchId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, COMPLETED, REFUNDED, CANCELLED]
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment created
 */
router.post(
  '/payments',
  authGuard,
  zodValidator(CreatePaymentSchema),
  revenueController.createPayment
);

/**
 * @openapi
 * /revenue/payments:
 *   get:
 *     summary: List payments with filters
 *     tags: [Revenue]
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
 *         name: groupId
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, REFUNDED, CANCELLED]
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
 *         description: Paginated list of payments
 */
router.get(
  '/payments',
  authGuard,
  zodValidator(ListPaymentsSchema, 'query'),
  revenueController.listPayments
);

/**
 * @openapi
 * /revenue/payments/{paymentId}:
 *   get:
 *     summary: Get payment details
 *     tags: [Revenue]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/payments/:paymentId', authGuard, revenueController.getPayment);

/**
 * @openapi
 * /revenue/payments/{paymentId}:
 *   patch:
 *     summary: Update a payment
 *     tags: [Revenue]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, COMPLETED, REFUNDED, CANCELLED]
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment updated
 */
router.patch(
  '/payments/:paymentId',
  authGuard,
  zodValidator(UpdatePaymentSchema),
  revenueController.updatePayment
);

/**
 * @openapi
 * /revenue/payments/{paymentId}:
 *   delete:
 *     summary: Delete a payment
 *     tags: [Revenue]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment deleted
 */
router.delete('/payments/:paymentId', authGuard, revenueController.deletePayment);

/**
 * @openapi
 * /revenue/stats:
 *   get:
 *     summary: Get comprehensive revenue statistics
 *     tags: [Revenue]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
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
 *         description: Revenue statistics
 */
router.get(
  '/stats',
  authGuard,
  zodValidator(RevenueStatsSchema, 'query'),
  revenueController.getRevenueStats
);

/**
 * @openapi
 * /revenue/by-batch:
 *   get:
 *     summary: Get revenue grouped by batch
 *     tags: [Revenue]
 *     parameters:
 *       - in: query
 *         name: batchId
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
 *         description: Revenue by batch
 */
router.get(
  '/by-batch',
  authGuard,
  zodValidator(RevenueStatsSchema, 'query'),
  revenueController.getRevenueByBatch
);

/**
 * @openapi
 * /revenue/by-group:
 *   get:
 *     summary: Get revenue grouped by group
 *     tags: [Revenue]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
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
 *         description: Revenue by group
 */
router.get(
  '/by-group',
  authGuard,
  zodValidator(RevenueStatsSchema, 'query'),
  revenueController.getRevenueByGroup
);

export default router;

