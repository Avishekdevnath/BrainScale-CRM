import { z } from 'zod';

export const CALL_STATUS_COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#6b7280', // gray
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#ec4899', // pink
] as const;

export const DEFAULT_CALL_STATUSES = [
  { value: 'completed', label: 'Completed', color: '#22c55e', order: 0 },
  { value: 'missed', label: 'Missed', color: '#ef4444', order: 1 },
  { value: 'busy', label: 'Busy', color: '#f59e0b', order: 2 },
  { value: 'no_answer', label: 'No Answer', color: '#6b7280', order: 3 },
  { value: 'voicemail', label: 'Voicemail', color: '#3b82f6', order: 4 },
  { value: 'other', label: 'Other', color: '#a855f7', order: 5 },
] as const;

export const CreateCallStatusOptionSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
});

export const UpdateCallStatusOptionSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateCallStatusOptionInput = z.infer<typeof CreateCallStatusOptionSchema>;
export type UpdateCallStatusOptionInput = z.infer<typeof UpdateCallStatusOptionSchema>;
