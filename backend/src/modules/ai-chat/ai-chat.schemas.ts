import { z } from 'zod';

export const CreateChatSchema = z.object({
  title: z.string().max(200).optional(),
});

export const UpdateChatSchema = z.object({
  title: z.string().min(1).max(200),
});

export const ChatIdParamSchema = z.object({
  chatId: z.string().min(1),
});

export const SendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  chatId: z.string().optional(),
});

export const GetChatHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ExportChatHistorySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  role: z.enum(['user', 'assistant']).optional(),
});

export const ExportAIDataSchema = z.object({
  dataType: z.enum(['students', 'callLogs', 'followups', 'callLists', 'stats']),
  filters: z.record(z.any()).optional(),
});

export type CreateChatInput = z.infer<typeof CreateChatSchema>;
export type UpdateChatInput = z.infer<typeof UpdateChatSchema>;
export type ChatIdParamInput = z.infer<typeof ChatIdParamSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type GetChatHistoryInput = z.infer<typeof GetChatHistorySchema>;
export type ExportChatHistoryInput = z.infer<typeof ExportChatHistorySchema>;
export type ExportAIDataInput = z.infer<typeof ExportAIDataSchema>;

