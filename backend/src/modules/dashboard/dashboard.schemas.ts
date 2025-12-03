import { z } from 'zod';

export const DashboardFiltersSchema = z.object({
  groupId: z.string().optional(),
  batchId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

export type DashboardFiltersInput = z.infer<typeof DashboardFiltersSchema>;

