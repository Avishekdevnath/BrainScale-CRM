import { create } from "zustand";

type NotificationState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
