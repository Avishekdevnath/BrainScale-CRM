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
  aiFeaturesEnabled: z.boolean().optional(),
  tasksEnabled: z.boolean().optional(),
  revenueEnabled: z.boolean().optional(),
});

export const AddMemberBody = z.object({
  role: z.string().min(1),
  user: z.discriminatedUnion('mode', [ownerExisting, ownerNew]),
});

export const ChangeMemberRoleBody = z.object({ role: z.string().min(1) });

export const ListUsersQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const SetSuperAdminBody = z.object({ isSuperAdmin: z.boolean() });

export const SetUserStatusBody = z.object({ active: z.boolean() });

export const ListAuditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  targetType: z.string().optional(),
});

export const UpdateUserBody = z.object({ name: z.string().min(1).max(100) });

export const ListFeedbackQuery = z.object({
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
});

export const ReplyFeedbackBody = z.object({ reply: z.string().min(1).max(2000) });

export const SetFeedbackStatusBody = z.object({ status: z.enum(['OPEN', 'RESOLVED']) });

export const CreateAnnouncementBody = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    targetType: z.enum(['ALL', 'SELECTED']),
    workspaceIds: z.array(z.string().min(1)).optional(),
  })
  .refine((d) => d.targetType === 'ALL' || (d.workspaceIds?.length ?? 0) > 0, {
    message: 'workspaceIds required when targetType is SELECTED',
    path: ['workspaceIds'],
  });

export const ListAnnouncementsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListWorkspacesQueryInput = z.infer<typeof ListWorkspacesQuery>;
export type CreateWorkspaceBodyInput = z.infer<typeof CreateWorkspaceBody>;
export type UpdateWorkspaceBodyInput = z.infer<typeof UpdateWorkspaceBody>;
export type AddMemberBodyInput = z.infer<typeof AddMemberBody>;
export type ChangeMemberRoleBodyInput = z.infer<typeof ChangeMemberRoleBody>;
export type ListUsersQueryInput = z.infer<typeof ListUsersQuery>;
export type SetSuperAdminBodyInput = z.infer<typeof SetSuperAdminBody>;
export type SetUserStatusBodyInput = z.infer<typeof SetUserStatusBody>;
export type ListAuditQueryInput = z.infer<typeof ListAuditQuery>;
export type UpdateUserBodyInput = z.infer<typeof UpdateUserBody>;
export type ListFeedbackQueryInput = z.infer<typeof ListFeedbackQuery>;
export type ReplyFeedbackBodyInput = z.infer<typeof ReplyFeedbackBody>;
export type SetFeedbackStatusBodyInput = z.infer<typeof SetFeedbackStatusBody>;
export type CreateAnnouncementBodyInput = z.infer<typeof CreateAnnouncementBody>;
export type ListAnnouncementsQueryInput = z.infer<typeof ListAnnouncementsQuery>;
