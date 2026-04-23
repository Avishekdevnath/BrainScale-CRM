import { z } from 'zod';

export const CreateTaskTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').default('#6366f1'),
  description: z.string().max(200).optional().nullable(),
});

export const UpdateTaskTypeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().max(200).optional().nullable(),
});

export type CreateTaskTypeInput = z.infer<typeof CreateTaskTypeSchema>;
export type UpdateTaskTypeInput = z.infer<typeof UpdateTaskTypeSchema>;
