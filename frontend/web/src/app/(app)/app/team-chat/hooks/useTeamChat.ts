'use client';

import { create } from 'zustand';
import type {
  Channel,
  DirectMessage,
  DmConversation,
  Message,
  MessageReaction,
  Notification,
  ChatViewState,
  UnreadCounts,
  TypingStatus,
} from '@/types/team-chat.types';

interface TeamChatState {
  // UI State
  currentView: ChatViewState;
  setCurrentView: (view: ChatViewState) => void;

  // Channels
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
  updateChannel: (channelId: string, channel: Partial<Channel>) => void;

  // Messages
  messages: Map<string, Message[]>; // channelId -> messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, message: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void; // For pagination

  // Direct Messages
  directMessages: Map<string, DirectMessage[]>; // userId -> messages
  setDirectMessages: (userId: string, messages: DirectMessage[]) => void;
  addDirectMessage: (userId: string, message: DirectMessage) => void;
  updateDirectMessage: (userId: string, messageId: string, message: Partial<DirectMessage>) => void;
  removeDirectMessage: (userId: string, messageId: string) => void;
  prependDirectMessages: (userId: string, messages: DirectMessage[]) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (notificationId: string) => void;

  // Unread counts
  unreadCounts: UnreadCounts;
  updateUnreadCounts: (counts: Partial<UnreadCounts>) => void;
  incrementUnread: (type: 'channels' | 'directMessages' | 'mentions', id: string) => void;
  resetUnread: (type: 'channels' | 'directMessages' | 'mentions', id: string) => void;

  // DM Conversations list
  dmConversations: DmConversation[];
  setDmConversations: (conversations: DmConversation[]) => void;

  // Active DM recipient (set when user picks someone from the dialog)
  activeDmUser: { id: string; name: string; email: string } | null;
  setActiveDmUser: (user: { id: string; name: string; email: string } | null) => void;

  // Reactions (messageId -> reactions)
  messageReactions: Map<string, MessageReaction[]>;
  setMessageReactions: (messageId: string, reactions: MessageReaction[]) => void;
  addMessageReaction: (messageId: string, reaction: MessageReaction) => void;
  removeMessageReaction: (messageId: string, reactionId: string) => void;

  // Typing status
  typingUsers: TypingStatus[];
  setTypingUsers: (statuses: TypingStatus[]) => void;

  // Loading states
  isLoadingChannels: boolean;
  setIsLoadingChannels: (loading: boolean) => void;
  isLoadingMessages: boolean;
  setIsLoadingMessages: (loading: boolean) => void;

  // Clear all state
  reset: () => void;
}

const initialUnreadCounts: UnreadCounts = {
  channels: {},
  directMessages: {},
  mentions: 0,
  total: 0,
};

export const useTeamChat = create<TeamChatState>((set, get) => ({
  // UI State
  currentView: { type: 'activity' },
  setCurrentView: (view) => set({ currentView: view }),

  // Channels
  channels: [],
  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((state) => ({
    channels: [...state.channels, channel],
  })),
  removeChannel: (channelId) => set((state) => ({
    channels: state.channels.filter((c) => c.id !== channelId),
  })),
  updateChannel: (channelId, updates) => set((state) => ({
    channels: state.channels.map((c) =>
      c.id === channelId ? { ...c, ...updates } : c
    ),
  })),

  // Messages
  messages: new Map(),
  setMessages: (channelId, messages) => set((state) => {
    const newMap = new Map(state.messages);
    newMap.set(channelId, messages);
    return { messages: newMap };
  }),
  addMessage: (channelId, message) => set((state) => {
    const newMap = new Map(state.messages);
    const existing = newMap.get(channelId) || [];
    newMap.set(channelId, [...existing, message]);
    return { messages: newMap };
  }),
  updateMessage: (channelId, messageId, updates) => set((state) => {
    const newMap = new Map(state.messages);
    const messages = newMap.get(channelId) || [];
    newMap.set(
      channelId,
      messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      )
    );
    return { messages: newMap };
  }),
  removeMessage: (channelId, messageId) => set((state) => {
    const newMap = new Map(state.messages);
    const messages = newMap.get(channelId) || [];
    newMap.set(
      channelId,
      messages.filter((m) => m.id !== messageId)
    );
    return { messages: newMap };
  }),
  prependMessages: (channelId, messages) => set((state) => {
    const newMap = new Map(state.messages);
    const existing = newMap.get(channelId) || [];
    newMap.set(channelId, [...messages, ...existing]);
    return { messages: newMap };
  }),

  // Direct Messages
  directMessages: new Map(),
  setDirectMessages: (userId, messages) => set((state) => {
    const newMap = new Map(state.directMessages);
    newMap.set(userId, messages);
    return { directMessages: newMap };
  }),
  addDirectMessage: (userId, message) => set((state) => {
    const newMap = new Map(state.directMessages);
    const existing = newMap.get(userId) || [];
    newMap.set(userId, [...existing, message]);
    return { directMessages: newMap };
  }),
  updateDirectMessage: (userId, messageId, updates) => set((state) => {
    const newMap = new Map(state.directMessages);
    const messages = newMap.get(userId) || [];
    newMap.set(
      userId,
      messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      )
    );
    return { directMessages: newMap };
  }),
  removeDirectMessage: (userId, messageId) => set((state) => {
    const newMap = new Map(state.directMessages);
    const messages = newMap.get(userId) || [];
    newMap.set(
      userId,
      messages.filter((m) => m.id !== messageId)
    );
    return { directMessages: newMap };
  }),
  prependDirectMessages: (userId, messages) => set((state) => {
    const newMap = new Map(state.directMessages);
    const existing = newMap.get(userId) || [];
    newMap.set(userId, [...messages, ...existing]);
    return { directMessages: newMap };
  }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
  })),
  markNotificationAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    ),
  })),
  markAllNotificationsAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
  })),
  removeNotification: (notificationId) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== notificationId),
  })),

  // Unread counts
  unreadCounts: initialUnreadCounts,
  updateUnreadCounts: (counts) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      ...counts,
    },
  })),
  incrementUnread: (type, id) => set((state) => {
    const newCounts = { ...state.unreadCounts };

    if (type === 'channels') {
      newCounts.channels[id] = (newCounts.channels[id] || 0) + 1;
    } else if (type === 'directMessages') {
      newCounts.directMessages[id] = (newCounts.directMessages[id] || 0) + 1;
    } else if (type === 'mentions') {
      newCounts.mentions += 1;
    }

    newCounts.total =
      Object.values(newCounts.channels).reduce((a, b) => a + b, 0) +
      Object.values(newCounts.directMessages).reduce((a, b) => a + b, 0) +
      newCounts.mentions;

    return { unreadCounts: newCounts };
  }),
  resetUnread: (type, id) => set((state) => {
    const newCounts = { ...state.unreadCounts };

    if (type === 'channels') {
      delete newCounts.channels[id];
    } else if (type === 'directMessages') {
      delete newCounts.directMessages[id];
    } else if (type === 'mentions') {
      newCounts.mentions = 0;
    }

    newCounts.total =
      Object.values(newCounts.channels).reduce((a, b) => a + b, 0) +
      Object.values(newCounts.directMessages).reduce((a, b) => a + b, 0) +
      newCounts.mentions;

    return { unreadCounts: newCounts };
  }),

  // DM Conversations
  dmConversations: [],
  setDmConversations: (conversations) => set({ dmConversations: conversations }),

  // Active DM recipient
  activeDmUser: null,
  setActiveDmUser: (user) => set({ activeDmUser: user }),

  // Reactions
  messageReactions: new Map(),
  setMessageReactions: (messageId, reactions) => set((state) => {
    const newMap = new Map(state.messageReactions);
    newMap.set(messageId, reactions);
    return { messageReactions: newMap };
  }),
  addMessageReaction: (messageId, reaction) => set((state) => {
    const newMap = new Map(state.messageReactions);
    const existing = newMap.get(messageId) || [];
    newMap.set(messageId, [...existing, reaction]);
    return { messageReactions: newMap };
  }),
  removeMessageReaction: (messageId, reactionId) => set((state) => {
    const newMap = new Map(state.messageReactions);
    const existing = newMap.get(messageId) || [];
    newMap.set(messageId, existing.filter((r) => r.id !== reactionId));
    return { messageReactions: newMap };
  }),

  // Typing
  typingUsers: [],
  setTypingUsers: (statuses) => set({ typingUsers: statuses }),

  // Loading states
  isLoadingChannels: false,
  setIsLoadingChannels: (loading) => set({ isLoadingChannels: loading }),
  isLoadingMessages: false,
  setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  // Reset
  reset: () => set({
    currentView: { type: 'activity' },
    channels: [],
    messages: new Map(),
    directMessages: new Map(),
    notifications: [],
    unreadCounts: initialUnreadCounts,
    dmConversations: [],
    activeDmUser: null,
    messageReactions: new Map(),
    typingUsers: [],
    isLoadingChannels: false,
    isLoadingMessages: false,
  }),
}));
