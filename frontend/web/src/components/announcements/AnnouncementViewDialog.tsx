"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone } from "lucide-react";
import { RichTextView, isRichDoc } from "./RichTextView";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types/notifications.types";

/** Member-facing full view of a platform announcement notification. */
export function AnnouncementViewDialog({
  notification,
  onOpenChange,
}: {
  notification: Notification | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={notification !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
              <Megaphone className="h-4 w-4 text-sky-500" />
            </span>
            {notification?.title}
          </DialogTitle>
        </DialogHeader>
        {notification && (
          <div className="space-y-3">
            {isRichDoc(notification.meta?.bodyRich) ? (
              <RichTextView doc={notification.meta.bodyRich} className="space-y-2 text-sm text-[var(--groups1-text)]" />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-[var(--groups1-text)]">{notification.body}</p>
            )}
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              {formatRelativeTime(notification.createdAt)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
