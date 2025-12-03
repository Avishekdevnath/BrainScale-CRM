import { z } from 'zod';

export const CreateBatchSchema = z.object({
  name: z.string().min(2, 'Batch name must be at least 2 characters'),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateBatchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const ListBatchesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
export type UpdateBatchInput = z.infer<typeof UpdateBatchSchema>;
export type ListBatchesInput = z.infer<typeof ListBatchesSchema>;

