import { z } from 'zod';

export const CreateCallSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  callStatus: z.string().min(1, 'Call status is required'),
  callDate: z.string().datetime().optional(), // ISO datetime string
  notes: z.string().optional(),
});

export const UpdateCallSchema = z.object({
  callStatus: z.string().optional(),
  callDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const ListCallsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  size: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCallInput = z.infer<typeof CreateCallSchema>;
export type UpdateCallInput = z.infer<typeof UpdateCallSchema>;
export type ListCallsInput = z.infer<typeof ListCallsSchema>;

