import { z } from 'zod';

export const CreateEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  groupId: z.string().min(1, 'Group ID is required'),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
});

export const UpdateEnrollmentSchema = z.object({
  isActive: z.boolean().optional(),
});

export const SetStudentStatusSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  status: z.enum(['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'LOST']),
});

export const UpdateModuleProgressSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  moduleId: z.string().min(1, 'Module ID is required'),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional(),
});

export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof UpdateEnrollmentSchema>;
export type SetStudentStatusInput = z.infer<typeof SetStudentStatusSchema>;
export type UpdateModuleProgressInput = z.infer<typeof UpdateModuleProgressSchema>;

