/**
 * Team Chat Types
 * Shared TypeScript types for team chat feature
 */

// ── Rich Text Editor Content (Tiptap JSON) ──────────────────────────────────
export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

export interface TiptapContent {
  type: 'doc';
  content: TiptapNode[];
}

// ── User ────────────────────────────────────────────────────────────────────
export interface ChatUser {
  id: string;
  name: string;
  email: string;
}

// ── Channels ────────────────────────────────────────────────────────────────
export type ChannelType = 'main' | 'resources' | 'custom';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  type: ChannelType;
  description?: string;
  createdBy: string;
  createdByUser?: ChatUser;
  createdAt: string;
  updatedAt: string;
  members?: UserChannelMembership[];
}

export interface UserChannelMembership {
  userId: string;
  channelId: string;
  joinedAt: string;
  lastReadAt: string;
}

// ── Messages ────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  channelId: string;
  userId: string;
  sender: ChatUser;
  content: TiptapContent;
  contentPlain: string;
  mentionedUsers: string[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  sender: ChatUser;
  recipientId: string;
  recipient: ChatUser;
  content: TiptapContent;
  contentPlain: string;
  mentionedUsers: string[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessage = Message | DirectMessage;

// ── Reactions ───────────────────────────────────────────────────────────────
export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user?: ChatUser;
}

// ── Read Receipts ────────────────────────────────────────────────────────────
export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  user?: ChatUser;
}

// ── Typing Status ────────────────────────────────────────────────────────────
export interface TypingStatus {
  id: string;
  userId: string;
  channelId?: string;
  dmUserId?: string;
  expiresAt: string;
  typingUser?: ChatUser;
}

// ── DM Conversation List ─────────────────────────────────────────────────────
export interface DmConversation {
  userId: string;
  user: ChatUser;
  latestMessage?: DirectMessage;
  unreadCount: number;
}

// ── Search Results ────────────────────────────────────────────────────────────
export interface SearchResults {
  messages: Message[];
  channels: Channel[];
}

// ── Notifications ──────────────────────────────────────────────────────────
export type NotificationType = 'mention' | 'direct_message';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  messageId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ── API Request/Response Types ──────────────────────────────────────────────

// Send Message Request
export interface SendMessageRequest {
  channelId: string;
  content: TiptapContent;
  mentionedUsers?: string[];
}

// Get Messages Response (paginated)
export interface GetMessagesResponse {
  items: Message[];
  hasMore: boolean;
  nextCursor?: {
    lastMessageId: string;
    lastCreatedAt: string;
  };
}

// Get Direct Messages Response (paginated)
export interface GetDirectMessagesResponse {
  items: DirectMessage[];
  hasMore: boolean;
  nextCursor?: {
    lastMessageId: string;
    lastCreatedAt: string;
  };
}

// Send Direct Message Request
export interface SendDirectMessageRequest {
  recipientId: string;
  content: TiptapContent;
  mentionedUsers?: string[];
}

// Edit Message Request
export interface EditMessageRequest {
  content: TiptapContent;
  mentionedUsers?: string[];
}

// ── UI State ────────────────────────────────────────────────────────────────
export type ChatViewType = 'activity' | 'channel' | 'direct-message';

export interface ChatViewState {
  type: ChatViewType;
  channelId?: string;
  userId?: string;
}

export interface UnreadCounts {
  channels: Record<string, number>;
  directMessages: Record<string, number>;
  mentions: number;
  total: number;
}

// ── Polling State ────────────────────────────────────────────────────────────
export interface PollState {
  isPolling: boolean;
  lastPoll: number;
  nextPollTime: number;
  error?: string;
}

// ── Web Push Subscription ────────────────────────────────────────────────────
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
