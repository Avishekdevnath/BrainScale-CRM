"use client";

import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Bell, Settings, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationPreferencesModal } from "@/components/notifications/NotificationPreferencesModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/store/notifications";
import { useWorkspaceStore } from "@/store/workspace";
import { apiClient } from "@/lib/api-client";

type FilterTab = "all" | "unread";

export default function NotificationsPage() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [showPrefs, setShowPrefs] = useState(false);

  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { decrementUnread, clearUnread } = useNotificationStore();

  const { data, isLoading, mutate: mutateList } = useNotifications({
    page,
    size: 20,
    unreadOnly: tab === "unread",
  });

  const notifications = data?.notifications ?? [];
  const pagination = data?.pagination;
  const unreadCount = data?.unreadCount ?? 0;

  const handleRead = async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    try {
      await apiClient.markNotificationRead(id);
      if (wasUnread) decrementUnread();
      mutateList();
      if (workspaceId) mutate(`${workspaceId}:notification-count`);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleDelete = async (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    try {
      await apiClient.deleteNotification(id);
      if (wasUnread) decrementUnread();
      mutateList();
      if (workspaceId) mutate(`${workspaceId}:notification-count`);
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      clearUnread();
      mutateList();
      if (workspaceId) mutate(`${workspaceId}:notification-count`);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleTabChange = (newTab: FilterTab) => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowPrefs(true)}>
            <Settings className="w-4 h-4 mr-1.5" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--groups1-border)]">
        {(["all", "unread"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--groups1-primary)] text-[var(--groups1-primary)]"
                : "border-transparent text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-[var(--groups1-border)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <div className="w-8 h-8 rounded-full bg-[var(--groups1-secondary)] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--groups1-secondary)] rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-[var(--groups1-secondary)] rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-[var(--groups1-secondary)] rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-[var(--groups1-text-secondary)]" />
            </div>
            <p className="text-base font-semibold text-[var(--groups1-text)]">
              {tab === "unread" ? "No unread notifications" : "You're all caught up!"}
            </p>
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
              {tab === "unread"
                ? "Switch to All to see previous notifications"
                : "Notifications will appear here when you have activity"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--groups1-border)]">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--groups1-text-secondary)]">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <NotificationPreferencesModal open={showPrefs} onOpenChange={setShowPrefs} />
    </div>
  );
}
