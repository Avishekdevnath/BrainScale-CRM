import { http, API_BASE_URL, getWorkspaceId, triggerBlobDownload } from "./http";
import {
  Chat,
  SendMessageResponse,
  ChatHistoryResponse,
  ChatListResponse,
  ExportChatHistoryOptions,
  ExportAIDataOptions,
} from "@/types/ai-chat.types";

export const aiChatApi = {
  // AI Chat methods - Chat CRUD
  async getChats(): Promise<ChatListResponse> {
    return http.request("/ai-chat/chats", {
      method: "GET",
    });
  },

  async getChatById(chatId: string): Promise<Chat> {
    return http.request(`/ai-chat/chats/${chatId}`, {
      method: "GET",
    });
  },

  async createChat(title?: string): Promise<Chat> {
    return http.request("/ai-chat/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  async updateChat(chatId: string, title: string): Promise<Chat> {
    return http.request(`/ai-chat/chats/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  async deleteChat(chatId: string): Promise<void> {
    return http.request(`/ai-chat/chats/${chatId}`, {
      method: "DELETE",
    });
  },

  // AI Chat methods - Messages
  sendChatMessage(message: string, chatId?: string): Promise<SendMessageResponse> {
    return http.request("/ai-chat/messages", {
      method: "POST",
      body: JSON.stringify({ message, chatId }),
    });
  },

  getChatHistory(chatId: string, limit?: number): Promise<ChatHistoryResponse> {
    const params = limit ? `?limit=${limit}` : "";
    return http.request(`/ai-chat/chats/${chatId}/messages${params}`, {
      method: "GET",
    });
  },

  clearChatHistory(chatId: string): Promise<void> {
    return http.request(`/ai-chat/chats/${chatId}/messages`, {
      method: "DELETE",
    });
  },

  async exportChatHistory(chatId: string, options?: ExportChatHistoryOptions & { format?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options?.dateTo) params.append('dateTo', options.dateTo);
    if (options?.role) params.append('role', options.role);
    params.append('format', options?.format ?? 'csv');

    const queryString = params.toString();
    const endpoint = `/ai-chat/chats/${chatId}/export/history${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${http.accessToken || ''}`,
        'X-Workspace-Id': getWorkspaceId() || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || `chat-history.${options?.format ?? 'csv'}`
      : `chat-history.${options?.format ?? 'csv'}`;

    triggerBlobDownload(blob, filename);
  },

  async exportAIData(options: ExportAIDataOptions & { format?: string }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/ai-chat/export/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${http.accessToken || ''}`,
        'X-Workspace-Id': getWorkspaceId() || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ ...options, format: options.format ?? 'csv' }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || `ai-data.${options?.format ?? 'csv'}`
      : `ai-data.${options?.format ?? 'csv'}`;

    triggerBlobDownload(blob, filename);
  },
};
