import { z } from 'zod';

export const ExportDataSchema = z.object({
  type: z.enum(['students', 'calls', 'followups', 'call-lists', 'dashboard']),
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  filters: z.object({
    groupId: z.string().optional(),
    batchId: z.string().optional(),
    courseId: z.string().optional(),
    status: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).optional(),
});

export type ExportDataInput = z.infer<typeof ExportDataSchema>;

