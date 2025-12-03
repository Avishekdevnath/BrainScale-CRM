import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth-guard';
import { asyncHandler } from '../../middleware/error-handler';
import * as revenueService from './revenue.service';

export const createPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await revenueService.createPayment(
    req.user!.workspaceId!,
    req.user!.sub,
    req.body
  );
  res.status(201).json(payment);
});

export const listPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await revenueService.listPayments(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(result);
});

export const getPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await revenueService.getPayment(
    req.params.paymentId,
    req.user!.workspaceId!
  );
  res.json(payment);
});

export const updatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payment = await revenueService.updatePayment(
    req.params.paymentId,
    req.user!.workspaceId!,
    req.body
  );
  res.json(payment);
});

export const deletePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await revenueService.deletePayment(
    req.params.paymentId,
    req.user!.workspaceId!
  );
  res.json(result);
});

export const getRevenueByBatch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const revenue = await revenueService.getRevenueByBatch(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(revenue);
});

export const getRevenueByGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const revenue = await revenueService.getRevenueByGroup(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(revenue);
});

export const getRevenueStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await revenueService.getRevenueStats(
    req.user!.workspaceId!,
    req.validatedData!
  );
  res.json(stats);
});

