import { z } from 'zod';

export const CreateGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  batchId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  batchId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const AlignGroupsToBatchSchema = z.object({
  groupIds: z.array(z.string()).min(1, 'At least one group ID is required'),
});

export const ListGroupsSchema = z.object({
  batchId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export type AlignGroupsToBatchInput = z.infer<typeof AlignGroupsToBatchSchema>;
export type ListGroupsInput = z.infer<typeof ListGroupsSchema>;

