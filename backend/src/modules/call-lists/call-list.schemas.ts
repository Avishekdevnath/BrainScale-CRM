import { z } from 'zod';

// Question schema for call list questions
export const QuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question text is required'),
  type: z.enum(['text', 'yes_no', 'multiple_choice', 'number', 'date']),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
}).refine(
  (data) => {
    // If multiple_choice, options must be provided and have at least 2 items
    if (data.type === 'multiple_choice') {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  {
    message: 'Multiple choice questions must have at least 2 options',
    path: ['options'],
  }
);

export const CreateCallListSchema = z
  .object({
    groupId: z.string().optional(),
    batchId: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  source: z.enum(['IMPORT', 'FILTER', 'MANUAL']),
    description: z.string().optional(),
    studentIds: z.array(z.string()).optional(),
    groupIds: z.array(z.string()).optional(),
    messages: z.array(z.string()).optional(), // Array of messages to convey
    questions: z.array(QuestionSchema).optional(), // Array of questions
  meta: z.record(z.string(), z.any()).optional(), // Custom fields configuration (JSON)
  })
  .refine(
    (data) => data.groupId || data.batchId || (data.studentIds && data.studentIds.length > 0),
    {
      message: 'Either groupId, batchId, or studentIds must be provided',
      path: ['groupId'],
    }
  )
  .refine(
    (data) => {
      // Validate question IDs are unique
      if (data.questions && data.questions.length > 0) {
        const ids = data.questions.map((q) => q.id);
        return new Set(ids).size === ids.length;
      }
      return true;
    },
    {
      message: 'Question IDs must be unique',
      path: ['questions'],
    }
  );

export const UpdateCallListSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  messages: z.array(z.string()).optional(),
  questions: z.array(QuestionSchema).optional(),
  meta: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => {
    // Validate question IDs are unique if questions are provided
    if (data.questions && data.questions.length > 0) {
      const ids = data.questions.map((q) => q.id);
      return new Set(ids).size === ids.length;
    }
    return true;
  },
  {
    message: 'Question IDs must be unique',
    path: ['questions'],
  }
);

export const AddCallListItemsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student ID is required'),
});

export const AssignCallListItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'At least one item ID is required'),
  assignedTo: z.string().optional(), // If not provided, assign to current user
});

export const UnassignCallListItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'At least one item ID is required'),
});

export const UpdateCallListItemSchema = z.object({
  state: z.enum(['QUEUED', 'CALLING', 'DONE', 'SKIPPED']).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  custom: z.record(z.string(), z.any()).optional(), // Custom field values (JSON)
});

export const ListCallListItemsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  size: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  state: z.enum(['QUEUED', 'CALLING', 'DONE', 'SKIPPED']).optional(),
  assignedTo: z.string().optional(),
  callLogStatus: z.enum(['completed', 'missed', 'busy', 'no_answer', 'voicemail', 'other']).optional(),
  followUpRequired: z.string().optional().transform((val) => {
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return undefined;
  }),
});

export const GetAvailableStudentsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  size: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  q: z.string().optional(), // Search query (name/phone/email)
  batchId: z.string().optional(), // Additional batch filter
  courseId: z.string().optional(), // Additional course filter
  moduleId: z.string().optional(), // Additional module filter
  status: z.enum(['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'LOST']).optional(),
});

export const GetMyCallsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  batchId: z.string().optional(),
  groupId: z.string().optional(),
  callListId: z.string().optional(),
  state: z.enum(['QUEUED', 'CALLING', 'DONE', 'SKIPPED']).optional(),
});

export const BulkPasteCallListSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  data: z.string().min(1, 'Data is required'),
  columnMapping: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  matchBy: z.enum(['email', 'phone', 'email_or_phone', 'name']).default('email_or_phone'),
  createNewStudents: z.boolean().default(true),
  skipDuplicates: z.boolean().default(true),
  messages: z.array(z.string()).optional(),
  questions: z.array(QuestionSchema).optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type CreateCallListInput = z.infer<typeof CreateCallListSchema>;
export type UpdateCallListInput = z.infer<typeof UpdateCallListSchema>;
export type AddCallListItemsInput = z.infer<typeof AddCallListItemsSchema>;
export type AssignCallListItemsInput = z.infer<typeof AssignCallListItemsSchema>;
export type UnassignCallListItemsInput = z.infer<typeof UnassignCallListItemsSchema>;
export type UpdateCallListItemInput = z.infer<typeof UpdateCallListItemSchema>;
export type ListCallListItemsInput = z.infer<typeof ListCallListItemsSchema>;
export type GetAvailableStudentsInput = z.infer<typeof GetAvailableStudentsSchema>;
export type GetMyCallsInput = z.infer<typeof GetMyCallsSchema>;
export type BulkPasteCallListInput = z.infer<typeof BulkPasteCallListSchema>;

