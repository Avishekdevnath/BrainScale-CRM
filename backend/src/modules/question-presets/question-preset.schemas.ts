import { z } from 'zod';

const QuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  type: z.enum(['text', 'yes_no', 'multiple_choice', 'number', 'date']),
  required: z.boolean(),
  order: z.number().int().min(0),
  shortLabel: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const CreateQuestionPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required').max(100),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
});

export const UpdateQuestionPresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  questions: z.array(QuestionSchema).min(1).optional(),
});

export type CreateQuestionPresetInput = z.infer<typeof CreateQuestionPresetSchema>;
export type UpdateQuestionPresetInput = z.infer<typeof UpdateQuestionPresetSchema>;
