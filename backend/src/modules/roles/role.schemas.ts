import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
});

export const AssignPermissionsSchema = z.object({
  permissionIds: z.array(z.string()).min(1, 'At least one permission is required'),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AssignPermissionsInput = z.infer<typeof AssignPermissionsSchema>;

