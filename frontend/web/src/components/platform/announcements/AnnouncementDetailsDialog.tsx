"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Megaphone, Trash2, CheckCheck, Mail } from "lucide-react";
import { usePlatformAnnouncement } from "@/hooks/usePlatform";
import { RichTextView, isRichDoc } from "@/components/announcements/RichTextView";
import type { Announcement } from "@/types/notifications.types";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";

interface AnnouncementDetailsDialogProps {
  announcementId: string | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (announcement: Announcement) => void;
  deletingId: string | null;
}

export function AnnouncementDetailsDialog({
  announcementId,
  onOpenChange,
  onDelete,
  deletingId,
}: AnnouncementDetailsDialogProps) {
  const { data, isLoading, error } = usePlatformAnnouncement(announcementId);
  const readRate =
    data && data.stats.deliveredCount > 0
      ? Math.round((data.stats.readCount / data.stats.deliveredCount) * 100)
      : 0;

  return (
    <Dialog open={announcementId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10">
              <Megaphone className="h-4 w-4 text-sky-500" />
            </span>
            {data?.title ?? "Announcement"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {Boolean(error) && <p className="text-sm text-red-500 py-4">Failed to load announcement.</p>}

        {data && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
              <span
                className={`${BADGE} ${
                  data.targetType === "ALL"
                    ? "border-sky-500/40 text-sky-500"
                    : "border-violet-500/40 text-violet-500"
                }`}
              >
                {data.targetType === "ALL" ? "All workspaces" : `${data.workspaceIds.length} selected`}
              </span>
              <span>{data.sentBy.name || data.sentBy.email}</span>
              <span>·</span>
              <span>{new Date(data.createdAt).toLocaleString()}</span>
            </div>

            {/* Body */}
            <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] p-3">
              {isRichDoc(data.bodyRich) ? (
                <RichTextView doc={data.bodyRich} className="space-y-2 text-sm text-[var(--groups1-text)]" />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-[var(--groups1-text)]">{data.body}</p>
              )}
            </div>

            {/* Delivery stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--groups1-border)] p-3 text-center">
                <Mail className="w-4 h-4 mx-auto text-sky-500" />
                <p className="text-lg font-bold text-[var(--groups1-text)]">{data.stats.deliveredCount}</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">Delivered</p>
              </div>
              <div className="rounded-lg border border-[var(--groups1-border)] p-3 text-center">
                <CheckCheck className="w-4 h-4 mx-auto text-emerald-500" />
                <p className="text-lg font-bold text-[var(--groups1-text)]">{data.stats.readCount}</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">Read</p>
              </div>
              <div className="rounded-lg border border-[var(--groups1-border)] p-3 text-center">
                <p className="text-lg font-bold text-[var(--groups1-text)] pt-4">{readRate}%</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">Read rate</p>
              </div>
            </div>

            {/* Per-workspace breakdown */}
            {data.stats.workspaces.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-[var(--groups1-text-secondary)]">By workspace</p>
                <div className="rounded-lg border border-[var(--groups1-border)] divide-y divide-[var(--groups1-border)]">
                  {data.stats.workspaces.map((w) => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-[var(--groups1-text)] truncate">{w.name}</span>
                      <span className="text-xs text-[var(--groups1-text-secondary)] shrink-0">
                        {w.read}/{w.delivered} read
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={deletingId === data.id}
                onClick={() => onDelete(data)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deletingId === data.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete announcement
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
