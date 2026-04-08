import { z } from 'zod';

export const TaskPriority = {
  NORMAL: 'NORMAL',
  URGENT: 'URGENT',
} as const;

export const TaskStatus = {
  AWAITING_ACCEPTANCE: 'AWAITING_ACCEPTANCE',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DECLINED: 'DECLINED',
  DONE: 'DONE',
} as const;

export const LinkedEntityType = {
  call_list: 'call_list',
  group: 'group',
  student: 'student',
  form: 'form',
} as const;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedToId: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().datetime({ message: 'Invalid due date' }),
  priority: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  linkedEntityType: z.enum(['call_list', 'group', 'student', 'form']).optional().nullable(),
  linkedEntityId: z.string().optional().nullable(),
  referredByMemberId: z.string().optional().nullable(),
  referredByName: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['NORMAL', 'URGENT']).optional(),
  linkedEntityType: z.enum(['call_list', 'group', 'student', 'form']).optional().nullable(),
  linkedEntityId: z.string().optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const CompleteTaskSchema = z.object({
  completionNote: z.string().optional().nullable(),
});

export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>;

export const DeclineTaskSchema = z.object({
  declineNote: z.string().optional().nullable(),
});

export type DeclineTaskInput = z.infer<typeof DeclineTaskSchema>;

export const ListTasksSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['AWAITING_ACCEPTANCE', 'ACCEPTED', 'IN_PROGRESS', 'DECLINED', 'DONE']).optional(),
  priority: z.enum(['NORMAL', 'URGENT']).optional(),
  assignedToId: z.string().optional(),
  assignedById: z.string().optional(),
});

export type ListTasksInput = z.infer<typeof ListTasksSchema>;
