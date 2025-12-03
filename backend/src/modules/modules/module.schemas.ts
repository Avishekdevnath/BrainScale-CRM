import { z } from 'zod';

export const CreateModuleSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  name: z.string().min(2, 'Module name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const UpdateModuleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateModuleInput = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleSchema>;

