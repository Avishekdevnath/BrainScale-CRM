import { z } from 'zod';

// Canonical mapping: 0 = Sunday ... 6 = Saturday.
export const DayOfWeekSchema = z.number().int().min(0).max(6);

export const SlotSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  batchId: z.string().nullable().optional(),
  slotGroup: z.string().trim().min(1),
  slotLabel: z.string().trim().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  order: z.number().int().min(0),
});

export const AssignmentSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  batchId: z.string().nullable().optional(),
  slotLabel: z.string().trim().min(1),
  order: z.number().int().min(0),
  memberId: z.string().trim().min(1),
  roleLabel: z.string().trim().nullable().optional(),
});

export const SaveTemplateSchema = z.object({
  slots: z.array(SlotSchema),
  assignments: z.array(AssignmentSchema),
});

export const ListExceptionsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ScheduleExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    memberId: z.string().trim().nullable().optional(),
    type: z.enum(['OFF_DAY', 'SLOT_OVERRIDE']),
    slotId: z.string().trim().nullable().optional(),
    overrideMemberId: z.string().trim().nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'OFF_DAY' && !value.memberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'memberId is required for OFF_DAY',
        path: ['memberId'],
      });
    }

    if (value.type === 'SLOT_OVERRIDE') {
      if (!value.slotId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'slotId is required for SLOT_OVERRIDE',
          path: ['slotId'],
        });
      }
      if (!value.overrideMemberId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'overrideMemberId is required for SLOT_OVERRIDE',
          path: ['overrideMemberId'],
        });
      }
    }
  });

export type SaveTemplateInput = z.infer<typeof SaveTemplateSchema>;
export type CreateScheduleExceptionInput = z.infer<typeof ScheduleExceptionSchema>;

// Bulk update schemas
export const UpdateSlotChangeSchema = z.object({
  action: z.literal('update_slot'),
  slotId: z.string(),
  data: z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional(),
    slotLabel: z.string().min(1).optional(),
  }),
});

export const UpdateAssignmentChangeSchema = z.object({
  action: z.literal('update_assignment'),
  assignmentId: z.string(),
  data: z.object({
    memberId: z.string().nullable(),
  }),
});

export const CreateSlotChangeSchema = z.object({
  action: z.literal('create_slot'),
  dayOfWeek: z.number().min(0).max(6),
  batchId: z.string(),
  data: z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotLabel: z.string().min(1),
    order: z.number().int().positive(),
  }),
});

export const DeleteSlotChangeSchema = z.object({
  action: z.literal('delete_slot'),
  slotId: z.string(),
});

export const ReorderBatchChangeSchema = z.object({
  action: z.literal('reorder_batch'),
  batchId: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  newOrder: z.number().int().positive(),
});

export const ScheduleChangeSchema = z.union([
  UpdateSlotChangeSchema,
  UpdateAssignmentChangeSchema,
  CreateSlotChangeSchema,
  DeleteSlotChangeSchema,
  ReorderBatchChangeSchema,
]);

export const BulkUpdateScheduleSchema = z.object({
  changes: z.array(ScheduleChangeSchema).min(1, 'At least one change required'),
});

export type BulkUpdateScheduleInput = z.infer<typeof BulkUpdateScheduleSchema>;
export type ScheduleChange = z.infer<typeof ScheduleChangeSchema>;
