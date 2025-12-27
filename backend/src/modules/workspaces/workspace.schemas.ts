import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(60),
  logo: z.union([z.string().url(), z.literal('')]).optional(),
  timezone: z.string().default('Asia/Dhaka'),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  logo: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  // Email digest preferences
  dailyDigestEnabled: z.boolean().optional(),
  dailyDigestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format').optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  weeklyDigestDay: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).optional(),
  weeklyDigestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format').optional(),
  followupRemindersEnabled: z.boolean().optional(),
  // AI features
  aiFeaturesEnabled: z.boolean().optional(),
  aiFeatures: z.array(z.string()).optional(), // Array of enabled AI features: ["summary", "sentiment", "chat"]
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  groupIds: z.array(z.string()).optional(),
});

export const UpdateMemberSchema = z
  .object({
    role: z.enum(['ADMIN', 'MEMBER']).optional(),
    customRoleId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Either role OR customRoleId must be provided, but not both
      const hasRole = data.role !== undefined;
      const hasCustomRole = data.customRoleId !== undefined;
      return hasRole !== hasCustomRole; // XOR: exactly one must be provided
    },
    {
      message: 'Either role or customRoleId must be provided, but not both',
      path: ['role'],
    }
  );

export const GrantGroupAccessSchema = z.object({
  groupIds: z.array(z.string()).min(1, 'At least one group ID required'),
});

export const CreateMemberWithAccountSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'MEMBER']).optional(),
    customRoleId: z.string().optional(),
    groupIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // Either role OR customRoleId must be provided, but not both
      const hasRole = data.role !== undefined;
      const hasCustomRole = data.customRoleId !== undefined;
      return hasRole !== hasCustomRole; // XOR: exactly one must be provided
    },
    {
      message: 'Either role or customRoleId must be provided, but not both',
      path: ['role'],
    }
  );

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type GrantGroupAccessInput = z.infer<typeof GrantGroupAccessSchema>;
export type CreateMemberWithAccountInput = z.infer<typeof CreateMemberWithAccountSchema>;

