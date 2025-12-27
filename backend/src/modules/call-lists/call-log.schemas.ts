import { z } from 'zod';

// Answer schema for call log answers
export const AnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.union([z.string(), z.number(), z.boolean()]),
  answerType: z.string(),
});

export const CreateCallLogSchema = z.object({
  callListItemId: z.string(),
  callDuration: z.number().int().min(0).optional(),
  status: z.enum(['completed', 'missed', 'busy', 'no_answer', 'voicemail', 'other']),
  answers: z.array(AnswerSchema).optional().default([]),
  notes: z.string().optional(),
  callerNote: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpRequired: z.boolean().optional().default(false),
  followUpNote: z.string().optional(), // Note for the follow-up call
});

export const UpdateCallLogSchema = z.object({
  callDuration: z.number().int().min(0).optional(),
  status: z.enum(['completed', 'missed', 'busy', 'no_answer', 'voicemail', 'other']).optional(),
  answers: z.array(AnswerSchema).optional(),
  notes: z.string().optional(),
  callerNote: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpNote: z.string().optional(), // Note for the follow-up call
});

export const ListCallLogsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  studentId: z.string().optional(),
  callListId: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  batchId: z.string().optional(),
  groupId: z.string().optional(),
});

export type CreateCallLogInput = z.infer<typeof CreateCallLogSchema>;
export type UpdateCallLogInput = z.infer<typeof UpdateCallLogSchema>;
export type ListCallLogsInput = z.infer<typeof ListCallLogsSchema>;
export type AnswerInput = z.infer<typeof AnswerSchema>;

