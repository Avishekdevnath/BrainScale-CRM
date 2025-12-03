import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  batchId: z.string().optional(), // Optional, can derive from group
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional().default('USD'),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED']).optional().default('PENDING'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED']).optional(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ListPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
  batchId: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export const RevenueStatsSchema = z.object({
  batchId: z.string().optional(),
  groupId: z.string().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
export type ListPaymentsInput = z.infer<typeof ListPaymentsSchema>;
export type RevenueStatsInput = z.infer<typeof RevenueStatsSchema>;

