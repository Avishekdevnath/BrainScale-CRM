import { http, buildQueryString } from "./http";
import type {
  Notification,
  NotificationPreference,
  NotificationsListResponse,
  NotificationCountResponse,
} from "@/types/notifications.types";

export const notificationsApi = {
  getNotifications(params?: { page?: number; size?: number; unreadOnly?: boolean }) {
    const qs = params ? buildQueryString(params as Record<string, string | number | boolean | undefined>) : "";
    return http.request<NotificationsListResponse>(`/notifications${qs}`);
  },

  getNotificationCount() {
    return http.request<NotificationCountResponse>("/notifications/count");
  },

  getUnreadAnnouncements() {
    return http.request<{ notifications: Notification[] }>("/notifications/announcements/unread");
  },

  markNotificationRead(id: string) {
    return http.request<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" });
  },

  markAllNotificationsRead() {
    return http.request<{ success: boolean }>("/notifications/read-all", { method: "PATCH" });
  },

  deleteNotification(id: string) {
    return http.request<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" });
  },

  getNotificationPreferences() {
    return http.request<NotificationPreference>("/notifications/preferences");
  },

  updateNotificationPreferences(data: Partial<Pick<NotificationPreference, "followupAssigned" | "followupDueSoon" | "followupOverdue" | "callLogCompleted" | "taskAssigned" | "taskDueSoon" | "taskUpdated" | "formResponseReceived">>) {
    return http.request<NotificationPreference>("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
