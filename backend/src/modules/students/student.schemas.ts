import { z } from 'zod';

export const CreateStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  discordId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  phones: z
    .array(
      z.object({
        phone: z.string().min(1, 'Phone number is required'),
        isPrimary: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
});

export const UpdateStudentSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  discordId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const ListStudentsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  size: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  q: z.string().optional(), // Search query (name/phone/email)
  groupId: z.string().optional(),
  batchId: z.string().optional(), // Filter by batch (via StudentBatch junction)
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'LOST']).optional(),
});

export const AddPhoneSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  isPrimary: z.boolean().optional().default(false),
});

/**
 * Old mapping format (backward compatible)
 */
export const OldMappingSchema = z.object({
  name: z
    .string()
    .min(1, 'Name column is required')
    .max(100, 'Name column header is too long'),
  email: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  discordId: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  phone: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  tags: z
    .string()
    .min(1)
    .max(100)
    .optional(),
});

/**
 * New flexible mapping format
 * Supports field paths like "student.name", "phone.0", "enrollment.groupName"
 */
export const FlexibleMappingSchema = z.record(z.string(), z.string());

/**
 * Combined mapping schema that accepts both old and new formats
 */
export const MappingSchema = z.union([OldMappingSchema, FlexibleMappingSchema]);

/**
 * Simple bulk import payload for pasted CSV data.
 *
 * Frontend parses the pasted CSV into `rows` (array of records),
 * and provides a mapping from internal fields to source column names.
 *
 * Mapping supports two formats:
 * - Old format: { name: "Full Name", email: "Email", phone: "Phone", tags: "Tags" }
 * - New format: { "student.name": "Full Name", "phone.0": "Primary Phone", "enrollment.groupName": "Group", ... }
 */
export const BulkPasteStudentsSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.any()))
    .min(1, 'At least one row is required for bulk import')
    .max(2000, 'Maximum 2000 rows can be imported at once'),
  mapping: MappingSchema,
  groupId: z.string().min(1, 'Group ID must be a non-empty string').optional(), // Optional group to assign all imported students to
});

export const AddStudentToBatchSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
});

export const SetStudentBatchesSchema = z.object({
  batchIds: z.array(z.string()).min(0, 'Batch IDs array is required'),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type ListStudentsInput = z.infer<typeof ListStudentsSchema>;
export type AddPhoneInput = z.infer<typeof AddPhoneSchema>;
export type BulkPasteStudentsInput = z.infer<typeof BulkPasteStudentsSchema>;
export type AddStudentToBatchInput = z.infer<typeof AddStudentToBatchSchema>;
export type SetStudentBatchesInput = z.infer<typeof SetStudentBatchesSchema>;

