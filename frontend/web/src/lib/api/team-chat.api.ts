import { http, buildQueryString } from "./http";
import type {
  Channel,
  DirectMessage,
  DmConversation,
  EditMessageRequest,
  GetDirectMessagesResponse,
  GetMessagesResponse,
  Message,
  MessageReaction,
  Notification as TeamChatNotification,
  SearchResults,
  TiptapContent,
} from "@/types/team-chat.types";

export const teamChatApi = {
  getTeamChatChannels(workspaceId?: string) {
    return http.request<Channel[]>("/team-chat/channels", {
      headers: workspaceId ? { "X-Workspace-Id": workspaceId } : undefined,
    });
  },

  createTeamChatChannel(data: { name: string; description?: string }, workspaceId?: string) {
    return http.request<Channel>("/team-chat/channels", {
      method: "POST",
      headers: workspaceId ? { "X-Workspace-Id": workspaceId } : undefined,
      body: JSON.stringify(data),
    });
  },

  markTeamChatChannelAsRead(channelId: string) {
    return http.request<{ userId: string; channelId: string; joinedAt: string; lastReadAt: string }>(
      `/team-chat/channels/${channelId}/read`,
      { method: "PATCH" }
    );
  },

  getTeamChatMessages(params: {
    channelId: string;
    limit?: number;
    lastMessageId?: string;
    lastCreatedAt?: string;
  }) {
    const queryString = buildQueryString({
      channelId: params.channelId,
      limit: params.limit,
      lastMessageId: params.lastMessageId,
      lastCreatedAt: params.lastCreatedAt,
    });
    return http.request<GetMessagesResponse>(`/team-chat/messages${queryString}`);
  },

  sendTeamChatMessage(data: {
    channelId: string;
    content: TiptapContent;
    mentionedUsers?: string[];
  }) {
    return http.request<Message>("/team-chat/messages/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getTeamChatNotifications(limit?: number) {
    const queryString = buildQueryString({ limit });
    return http.request<TeamChatNotification[]>(`/team-chat/notifications${queryString}`);
  },

  markTeamChatNotificationAsRead(notificationId: string) {
    return http.request<TeamChatNotification>(`/team-chat/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  markAllTeamChatNotificationsAsRead() {
    return http.request<{ success: boolean; updatedCount: number }>(
      "/team-chat/notifications/read-all",
      { method: "PATCH" }
    );
  },

  getTeamChatDirectMessagesList() {
    return http.request<DmConversation[]>("/team-chat/direct-messages/list");
  },

  getTeamChatDirectMessages(params: {
    userId: string;
    limit?: number;
    lastMessageId?: string;
    lastCreatedAt?: string;
  }) {
    const queryString = buildQueryString({
      limit: params.limit,
      lastMessageId: params.lastMessageId,
      lastCreatedAt: params.lastCreatedAt,
    });
    return http.request<GetDirectMessagesResponse>(
      `/team-chat/direct-messages/${params.userId}${queryString}`
    );
  },

  sendTeamChatDirectMessage(data: {
    recipientId: string;
    content: TiptapContent;
    mentionedUsers?: string[];
  }) {
    return http.request<DirectMessage>("/team-chat/direct-messages/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getTeamChatTypingStatus(params: { channelId?: string; dmUserId?: string }) {
    const queryString = buildQueryString({
      channelId: params.channelId,
      dmUserId: params.dmUserId,
    });
    return http.request<Array<{ userId: string; userName?: string | null }>>(
      `/team-chat/typing${queryString}`
    );
  },

  reportTeamChatTyping(data: { channelId?: string; dmUserId?: string }) {
    return http.request<{ success: boolean }>("/team-chat/typing", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  searchTeamChat(query: string, limit: number = 20) {
    const queryString = buildQueryString({ q: query, limit });
    return http.request<SearchResults>(`/team-chat/search${queryString}`);
  },

  markTeamChatMessagesAsRead(messageIds: string[]) {
    return http.request<{ success: boolean }>("/team-chat/messages/read", {
      method: "PATCH",
      body: JSON.stringify({ messageIds }),
    });
  },

  addTeamChatReaction(messageId: string, emoji: string) {
    return http.request<MessageReaction>(`/team-chat/messages/${messageId}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
  },

  removeTeamChatReaction(messageId: string, emoji: string) {
    return http.request<{ success: boolean }>(
      `/team-chat/messages/${messageId}/react/${encodeURIComponent(emoji)}`,
      { method: "DELETE" }
    );
  },

  deleteTeamChatMessage(messageId: string) {
    return http.request<Message | DirectMessage>(`/team-chat/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  deleteTeamChatDirectMessage(messageId: string) {
    return http.request<{ success: boolean; id: string }>(`/team-chat/direct-messages/${messageId}`, {
      method: "DELETE",
    });
  },

  editTeamChatMessage(messageId: string, data: EditMessageRequest) {
    return http.request<Message>(`/team-chat/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
