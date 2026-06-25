import { z } from 'zod';

const ownerExisting = z.object({ mode: z.literal('existing'), email: z.string().email() });
const ownerNew = z.object({ mode: z.literal('new'), email: z.string().email(), name: z.string().min(1) });

export const ListWorkspacesQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'name', 'members']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const CreateWorkspaceBody = z.object({
  name: z.string().min(2),
  plan: z.string().optional(),
  callSystemV2: z.boolean().optional(),
  owner: z.discriminatedUnion('mode', [ownerExisting, ownerNew]),
});

export const UpdateWorkspaceBody = z.object({
  name: z.string().min(2).optional(),
  plan: z.string().optional(),
  callSystemV2: z.boolean().optional(),
});

export const AddMemberBody = z.object({
  role: z.string().min(1),
  user: z.discriminatedUnion('mode', [ownerExisting, ownerNew]),
});

export const ChangeMemberRoleBody = z.object({ role: z.string().min(1) });

export type ListWorkspacesQueryInput = z.infer<typeof ListWorkspacesQuery>;
export type CreateWorkspaceBodyInput = z.infer<typeof CreateWorkspaceBody>;
export type UpdateWorkspaceBodyInput = z.infer<typeof UpdateWorkspaceBody>;
export type AddMemberBodyInput = z.infer<typeof AddMemberBody>;
export type ChangeMemberRoleBodyInput = z.infer<typeof ChangeMemberRoleBody>;
