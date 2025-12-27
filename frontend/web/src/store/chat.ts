import { create } from "zustand";
import type { Chat } from "@/types/ai-chat.types";

// Load from localStorage (client-side only)
const loadFromStorage = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("selectedChatId");
    return stored;
  } catch {
    // Ignore errors
  }
  return null;
};

type ChatState = {
  selectedChatId: string | null;
  chats: Chat[];
  _hasHydrated: boolean;
  setSelectedChatId: (chatId: string | null) => void;
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  getSelectedChatId: () => string | null;
  clear: () => void;
  hydrate: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  selectedChatId: null,
  chats: [],
  _hasHydrated: false,
  setSelectedChatId: (chatId) => {
    if (chatId) {
      try {
        localStorage.setItem("selectedChatId", chatId);
      } catch {
        // Ignore errors
      }
    } else {
      try {
        localStorage.removeItem("selectedChatId");
      } catch {
        // Ignore errors
      }
    }
    set({ selectedChatId: chatId });
  },
  setChats: (chats) => {
    set({ chats });
  },
  addChat: (chat) => {
    set((state) => ({
      chats: [chat, ...state.chats],
    }));
  },
  updateChat: (chatId, updates) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      ),
    }));
  },
  removeChat: (chatId) => {
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
      selectedChatId:
        state.selectedChatId === chatId
          ? state.chats.find((c) => c.id !== chatId)?.id || null
          : state.selectedChatId,
    }));
  },
  getSelectedChatId: () => {
    const state = get();
    return state.selectedChatId;
  },
  clear: () => {
    try {
      localStorage.removeItem("selectedChatId");
    } catch {
      // Ignore errors
    }
    set({ selectedChatId: null, chats: [] });
  },
  hydrate: () => {
    if (get()._hasHydrated) return; // Only hydrate once
    const stored = loadFromStorage();
    if (stored) {
      set({ selectedChatId: stored, _hasHydrated: true });
    } else {
      set({ _hasHydrated: true });
    }
  },
}));

