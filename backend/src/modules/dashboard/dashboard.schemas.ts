import { z } from 'zod';

export const DashboardFiltersSchema = z.object({
  groupId: z.string().optional(),
  batchId: z.string().optional(),
  callerId: z.string().optional(), // WorkspaceMember ID — filter by assigned caller
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

export type DashboardFiltersInput = z.infer<typeof DashboardFiltersSchema>;

export interface FollowupsTrendItem {
  date: string; // "2024-03", "2024-04", etc. (format matches period)
  pending: number;
  overdue: number;
}

