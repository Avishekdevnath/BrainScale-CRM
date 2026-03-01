import { z } from 'zod';

export const ListNotificationsSchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  size: z.string().optional().transform(v => (v ? parseInt(v, 10) : 20)),
  unreadOnly: z.string().optional().transform(v => v === 'true'),
});

export const UpdatePreferencesSchema = z.object({
  followupAssigned: z.boolean().optional(),
  followupDueSoon: z.boolean().optional(),
  followupOverdue: z.boolean().optional(),
  callLogCompleted: z.boolean().optional(),
});

export type ListNotificationsInput = z.infer<typeof ListNotificationsSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
