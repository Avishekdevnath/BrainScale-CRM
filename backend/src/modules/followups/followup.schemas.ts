import { z } from 'zod';
import { AnswerSchema } from '../call-lists/call-log.schemas';

export const CreateFollowupSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  callListId: z.string().optional(), // Optional reference to originating call list
  previousCallLogId: z.string().optional(), // Optional reference to call log that triggered this follow-up
  assignedTo: z.string().optional(), // Member ID
  dueAt: z.string().datetime('Invalid date format'), // ISO datetime string
  notes: z.string().optional(),
});

export const UpdateFollowupSchema = z.object({
  assignedTo: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'DONE', 'SKIPPED']).optional(),
  notes: z.string().optional(),
});

export const ListFollowupsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  size: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  status: z.enum(['PENDING', 'DONE', 'SKIPPED']).optional(),
  assignedTo: z.string().optional(), // Member ID
  callListId: z.string().optional(), // Filter by call list
  groupId: z.string().optional(), // Filter by group
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const CreateFollowupCallLogSchema = z.object({
  followupId: z.string().min(1, 'Follow-up ID is required'),
  callerId: z.string().optional(), // Optional caller member ID
  callDuration: z.number().int().min(0).optional(),
  status: z.enum(['completed', 'missed', 'busy', 'no_answer', 'voicemail', 'other']),
  answers: z.array(AnswerSchema).default([]), // Allow empty array if no questions
  notes: z.string().optional(),
  callerNote: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpRequired: z.boolean().optional().default(false),
  followUpNote: z.string().optional(), // Note for the new follow-up when scheduling
});

export type CreateFollowupInput = z.infer<typeof CreateFollowupSchema>;
export type UpdateFollowupInput = z.infer<typeof UpdateFollowupSchema>;
export type ListFollowupsInput = z.infer<typeof ListFollowupsSchema>;
export type CreateFollowupCallLogInput = z.infer<typeof CreateFollowupCallLogSchema>;

