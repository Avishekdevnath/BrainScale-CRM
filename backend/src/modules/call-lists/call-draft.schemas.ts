import { z } from 'zod';

export const DraftPayloadSchema = z.object({
  answers: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  callerNote: z.string().optional(),
  status: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
  followUpNote: z.string().optional(),
  callDuration: z.union([z.string(), z.number()]).optional(),
  savedAt: z.string().optional(),
});

export const UpsertCallDraftSchema = z.object({
  payload: DraftPayloadSchema,
});

export const ListCallDraftsSchema = z.object({
  callListId: z.string().optional(),
});

export const SubmitAllDraftsSchema = z.object({
  callListId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
});

export type UpsertCallDraftInput = z.infer<typeof UpsertCallDraftSchema>;
export type ListCallDraftsInput = z.infer<typeof ListCallDraftsSchema>;
export type SubmitAllDraftsInput = z.infer<typeof SubmitAllDraftsSchema>;
export type DraftPayload = z.infer<typeof DraftPayloadSchema>;
