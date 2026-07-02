"use client";

import * as React from "react";
import { mutate } from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { useNotificationStore } from "@/store/notifications";
import type { Notification } from "@/types/notifications.types";

const AUTO_DISMISS_MS = 10_000;

/**
 * Shows unread platform announcements as a centered modal on app open,
 * oldest first, one at a time. Each modal auto-dismisses after 10 seconds.
 * Displaying an announcement marks it read immediately (display counts as read).
 */
export function AnnouncementModal() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { decrementUnread } = useNotificationStore();
  const [queue, setQueue] = React.useState<Notification[]>([]);
  const [index, setIndex] = React.useState(0);
  const fetchedForWorkspace = React.useRef<string | null>(null);

  // Fetch once per workspace after it is ready.
  React.useEffect(() => {
    if (!workspaceId || fetchedForWorkspace.current === workspaceId) return;
    fetchedForWorkspace.current = workspaceId;
    let cancelled = false;
    apiClient
      .getUnreadAnnouncements()
      .then((res) => {
        if (!cancelled && res.notifications.length > 0) {
          setQueue(res.notifications);
          setIndex(0);
        }
      })
      .catch(() => {
        // Non-critical: announcements still reachable from the bell.
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const current = index < queue.length ? queue[index] : null;

  // Display counts as read: mark immediately so a refresh doesn't re-show it.
  React.useEffect(() => {
    if (!current) return;
    apiClient
      .markNotificationRead(current.id)
      .then(() => {
        decrementUnread();
        if (workspaceId) mutate(`${workspaceId}:notification-count`);
      })
      .catch(() => {});
  }, [current, workspaceId, decrementUnread]);

  // Auto-dismiss after 10 seconds.
  React.useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) setIndex((i) => i + 1); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10">
              <Megaphone className="h-4 w-4 text-sky-500" />
            </span>
            {current.title}
          </DialogTitle>
        </DialogHeader>
        <p className="whitespace-pre-wrap text-sm text-[var(--groups1-text-secondary)]">
          {current.body}
        </p>
        <div className="flex justify-end">
          <Button onClick={() => setIndex((i) => i + 1)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
