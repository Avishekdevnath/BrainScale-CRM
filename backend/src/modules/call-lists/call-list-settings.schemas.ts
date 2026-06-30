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
  { value: 'connected', label: 'Connected', color: '#22c55e', order: 0, isConnected: true, polarity: 'positive' },
  { value: 'not_received', label: 'Not Received', color: '#6b7280', order: 1, isConnected: false, polarity: 'neutral' },
  { value: 'switched_off', label: 'Switched Off', color: '#ef4444', order: 2, isConnected: false, polarity: 'negative' },
  { value: 'call_back_later', label: 'Call Back Later', color: '#3b82f6', order: 3, isConnected: true, polarity: 'neutral' },
  { value: 'other', label: 'Others', color: '#a855f7', order: 4, isConnected: false, polarity: 'neutral' },
] as const;

export const POLARITY_VALUES = ['positive', 'negative', 'neutral'] as const;
export type Polarity = typeof POLARITY_VALUES[number];

export const CreateCallStatusOptionSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
  isConnected: z.boolean().optional(),
  polarity: z.enum(POLARITY_VALUES).optional(),
});

export const UpdateCallStatusOptionSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
  order: z.number().int().min(0).optional(),
  isConnected: z.boolean().optional(),
  polarity: z.enum(POLARITY_VALUES).optional(),
});

export type CreateCallStatusOptionInput = z.infer<typeof CreateCallStatusOptionSchema>;
export type UpdateCallStatusOptionInput = z.infer<typeof UpdateCallStatusOptionSchema>;
