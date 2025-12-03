import { z } from 'zod';

export const SendInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
  customRoleId: z.string().optional(),
  groupIds: z.array(z.string()).optional(),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type SendInvitationInput = z.infer<typeof SendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

