"use client";

import * as React from "react";
import useSWR, { mutate } from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { useNotificationStore } from "@/store/notifications";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { RichTextView, isRichDoc } from "./RichTextView";
import type { Notification } from "@/types/notifications.types";

const AUTO_DISMISS_MS = 10_000;
const POLL_MS = 30_000;

/**
 * Shows unread platform announcements as a centered modal, oldest first,
 * one at a time. Polls every 30s (tab visible) so announcements sent while
 * the app is open also pop up. Each modal auto-dismisses after 10 seconds;
 * displaying an announcement marks it read immediately.
 */
export function AnnouncementModal() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { decrementUnread } = useNotificationStore();
  const visible = useDocumentVisible();
  const [queue, setQueue] = React.useState<Notification[]>([]);
  const [index, setIndex] = React.useState(0);
  const shownIds = React.useRef<Set<string>>(new Set());

  const { data } = useSWR(
    workspaceId ? `${workspaceId}:unread-announcements` : null,
    () => apiClient.getUnreadAnnouncements(),
    {
      refreshInterval: visible ? POLL_MS : 0,
      revalidateOnFocus: true,
    }
  );

  // Merge newly arrived unread announcements into the queue. Shown ones are
  // marked read server-side immediately, so they never come back; shownIds
  // guards against re-adding one whose mark-read request is still in flight.
  React.useEffect(() => {
    const incoming = data?.notifications ?? [];
    if (incoming.length === 0) return;
    setQueue((prev) => {
      const known = new Set(prev.map((n) => n.id));
      const fresh = incoming.filter((n) => !known.has(n.id) && !shownIds.current.has(n.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, [data]);

  const current = index < queue.length ? queue[index] : null;

  // Display counts as read: mark immediately so a refresh doesn't re-show it.
  React.useEffect(() => {
    if (!current) return;
    shownIds.current.add(current.id);
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
        {isRichDoc(current.meta?.bodyRich) ? (
          <RichTextView doc={current.meta.bodyRich} />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-[var(--groups1-text-secondary)]">
            {current.body}
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={() => setIndex((i) => i + 1)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
