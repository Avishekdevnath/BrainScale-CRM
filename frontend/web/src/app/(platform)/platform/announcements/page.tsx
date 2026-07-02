"use client";

import { useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { usePlatformAnnouncements, usePlatformWorkspaces } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";

const PAGE_SIZE = 20;
const BODY_MAX = 2000;
const TITLE_MAX = 200;

export default function PlatformAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, mutate } = usePlatformAnnouncements({ size: PAGE_SIZE, page });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Compose form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Workspace picker (only fetched content matters when SELECTED, cheap either way)
  const { data: workspacesData } = usePlatformWorkspaces({ size: 100 });
  const workspaces = workspacesData?.items ?? [];

  const toggleWorkspace = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (targetType === "ALL" || selectedIds.length > 0) &&
    !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await apiClient.platformCreateAnnouncement({
        title: title.trim(),
        body: body.trim(),
        targetType,
        ...(targetType === "SELECTED" ? { workspaceIds: selectedIds } : {}),
      });
      toast.success(`Announcement sent to ${result.recipientCount} member${result.recipientCount === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      setTargetType("ALL");
      setSelectedIds([]);
      setPage(1);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-[var(--groups1-primary)]" />
        <h1 className="text-xl font-bold text-[var(--groups1-text)]">Announcements</h1>
      </div>

      {/* Compose */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">New announcement</p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder="Title"
          className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
        />

        <div className="space-y-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            rows={4}
            placeholder="Message shown to workspace members…"
            className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none resize-none"
          />
          <p className="text-right text-xs text-[var(--groups1-text-secondary)]">
            {body.length}/{BODY_MAX}
          </p>
        </div>

        {/* Target */}
        <div className="flex items-center gap-4 text-sm text-[var(--groups1-text)]">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={targetType === "ALL"}
              onChange={() => setTargetType("ALL")}
            />
            All workspaces
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={targetType === "SELECTED"}
              onChange={() => setTargetType("SELECTED")}
            />
            Selected workspaces
          </label>
        </div>

        {targetType === "SELECTED" && (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--groups1-border)] divide-y divide-[var(--groups1-border)]">
            {workspaces.length === 0 && (
              <p className="p-3 text-xs text-[var(--groups1-text-secondary)]">No workspaces found.</p>
            )}
            {workspaces.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--groups1-text)] cursor-pointer hover:bg-[var(--groups1-primary)]/5"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(w.id)}
                  onChange={() => toggleWorkspace(w.id)}
                />
                <span className="flex-1">{w.name}</span>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  {w.memberCount} member{w.memberCount === 1 ? "" : "s"}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!canSend}
            onClick={send}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending…" : "Send announcement"}
          </button>
        </div>
      </div>

      {/* History */}
      <h2 className="text-sm font-semibold text-[var(--groups1-text)]">Sent announcements</h2>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load announcements.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No announcements sent yet.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-[var(--groups1-text)]">{a.title}</p>
                <div className="flex items-center gap-2 shrink-0 text-xs text-[var(--groups1-text-secondary)]">
                  <span className={`${BADGE} border-[var(--groups1-border)]`}>
                    {a.targetType === "ALL" ? "All workspaces" : `${a.workspaceIds.length} selected`}
                  </span>
                  <span className={`${BADGE} border-sky-500/40 text-sky-500`}>
                    {a.recipientCount} recipient{a.recipientCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                {a.sentBy.name || a.sentBy.email} · {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[var(--groups1-text-secondary)]">
            Page {page} of {totalPages} · {data.total} total
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
