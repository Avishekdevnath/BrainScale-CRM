import { z } from 'zod';

// Message content schema (Tiptap JSON)
export const tiptapContentSchema = z.any().refine(
  (val) => val && typeof val === 'object' && 'type' in val,
  { message: 'Content must be valid Tiptap JSON' }
);

// Send Message Schema
export const sendMessageSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  content: tiptapContentSchema,
  mentionedUsers: z.array(z.string()).optional().default([]),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Edit Message Schema
export const editMessageSchema = z.object({
  content: tiptapContentSchema,
  mentionedUsers: z.array(z.string()).optional().default([]),
});

export type EditMessageInput = z.infer<typeof editMessageSchema>;

// Get Messages Schema (for pagination)
export const getMessagesSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default(50),
  lastMessageId: z.string().optional(),
  lastCreatedAt: z.string().optional(),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;

// Send Direct Message Schema
export const sendDirectMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: tiptapContentSchema,
  mentionedUsers: z.array(z.string()).optional().default([]),
});

export type SendDirectMessageInput = z.infer<typeof sendDirectMessageSchema>;

export const getDirectMessagesQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default(50),
  lastMessageId: z.string().optional(),
  lastCreatedAt: z.string().optional(),
});

// Get Direct Messages Schema
export const getDirectMessagesSchema = getDirectMessagesQuerySchema.extend({
  userId: z.string().min(1, 'User ID is required'),
});

export type GetDirectMessagesInput = z.infer<typeof getDirectMessagesSchema>;

// Create Channel Schema
export const createChannelSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

// Get Channels Schema
export const getChannelsSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

export type GetChannelsInput = z.infer<typeof getChannelsSchema>;

// Add Reaction Schema
export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export type AddReactionInput = z.infer<typeof addReactionSchema>;

// Mark As Read Schema
export const markAsReadSchema = z.object({
  messageIds: z.array(z.string()).min(1),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

// Set Typing Status Schema
export const setTypingStatusSchema = z.object({
  channelId: z.string().optional(),
  dmUserId: z.string().optional(),
}).refine((data) => data.channelId || data.dmUserId, {
  message: 'Either channelId or dmUserId must be provided',
});

export type SetTypingStatusInput = z.infer<typeof setTypingStatusSchema>;

// Search Schema
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional().default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
