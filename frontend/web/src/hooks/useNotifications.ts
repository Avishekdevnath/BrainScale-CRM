"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { useNotificationStore } from "@/store/notifications";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import type {
  NotificationsListResponse,
  NotificationCountResponse,
  NotificationPreference,
} from "@/types/notifications.types";

export function useNotifications(params?: {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}) {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { setUnreadCount } = useNotificationStore();
  const key = workspaceId
    ? `${workspaceId}:notifications-${JSON.stringify(params ?? {})}`
    : null;

  return useSWR<NotificationsListResponse>(
    key,
    () => apiClient.getNotifications(params),
    {
      revalidateOnFocus: false,
      onSuccess: (data) => setUnreadCount(data.unreadCount),
    }
  );
}

export function useNotificationCount() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { setUnreadCount } = useNotificationStore();
  const visible = useDocumentVisible();
  const key = workspaceId ? `${workspaceId}:notification-count` : null;

  return useSWR<NotificationCountResponse>(
    key,
    () => apiClient.getNotificationCount(),
    {
      refreshInterval: visible ? 30000 : 0, // Pause polling on hidden tab
      revalidateOnFocus: true,
      onSuccess: (data) => setUnreadCount(data.unreadCount),
    }
  );
}

export function useNotificationPreferences() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const key = workspaceId ? `${workspaceId}:notification-preferences` : null;

  return useSWR<NotificationPreference>(
    key,
    () => apiClient.getNotificationPreferences(),
    { revalidateOnFocus: false }
  );
}
