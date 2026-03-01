"use client";

import { useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { mutate } from "swr";
import { toast } from "sonner";
import { Bell, Settings, CheckCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/store/notifications";
import { useWorkspaceStore } from "@/store/workspace";
import { apiClient } from "@/lib/api-client";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { decrementUnread, clearUnread } = useNotificationStore();

  // Only fetch the list when the popover is open
  const { data, isLoading, mutate: mutateList } = useNotifications(
    open ? { size: 10 } : undefined
  );

  const notifications = data?.notifications ?? [];

  const handleRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      decrementUnread();
      mutateList();
      if (workspaceId) mutate(`${workspaceId}:notification-count`);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteNotification(id);
      const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
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

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--groups1-error)] rounded-full" />
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className={cn(
              "z-50 w-[360px] bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-xl overflow-hidden",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--groups1-border)]">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[var(--groups1-text)]">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-[var(--groups1-primary)] text-white px-1.5 py-0.5 rounded-full font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={() => {
                    setOpen(false);
                    setShowPrefs(true);
                  }}
                  title="Notification preferences"
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-0 divide-y divide-[var(--groups1-border)]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--groups1-secondary)] animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[var(--groups1-secondary)] rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-[var(--groups1-secondary)] rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-[var(--groups1-text-secondary)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--groups1-text)]">
                    You&apos;re all caught up!
                  </p>
                  <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                    No notifications yet
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

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-[var(--groups1-border)] px-4 py-2">
                <Link
                  href="/app/notifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs text-[var(--groups1-primary)] hover:underline py-1"
                >
                  View all notifications
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <NotificationPreferencesModal
        open={showPrefs}
        onOpenChange={setShowPrefs}
      />
    </>
  );
}
