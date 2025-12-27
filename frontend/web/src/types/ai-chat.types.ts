export type ChatMessageRole = 'user' | 'assistant';

export interface Chat {
  id: string;
  workspaceId: string;
  userId: string;
  title: string | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  summary?: string | null; // First message content for summary
  _count?: {
    messages: number;
  };
}

export interface ChatMessage {
  id: string;
  chatId: string;
  workspaceId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  metadata?: {
    functionCalls?: Array<{
      name: string;
      arguments: any;
      result?: any;
    }>;
    tokensUsed?: number;
    model?: string;
    processingTimeMs?: number;
  } | null;
  createdAt: string; // ISO 8601 datetime
}

export interface SendMessageRequest {
  message: string;
  chatId?: string;
}

export interface SendMessageResponse {
  chatId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ChatHistoryResponse extends Array<ChatMessage> {}

export interface ChatListResponse extends Array<Chat> {}

export interface CreateChatRequest {
  title?: string;
}

export interface UpdateChatRequest {
  title: string;
}

export interface ExportChatHistoryOptions {
  dateFrom?: string;
  dateTo?: string;
  role?: 'user' | 'assistant';
}

export interface ExportAIDataOptions {
  dataType: 'students' | 'callLogs' | 'followups' | 'callLists' | 'stats';
  filters?: Record<string, any>;
}

