"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { usePlatformFeedback } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";

const PAGE_SIZE = 20;

export default function PlatformFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<"" | "OPEN" | "RESOLVED">("");
  const [page, setPage] = useState(1);
  const query: Record<string, string | number | undefined> = { size: PAGE_SIZE, page };
  if (statusFilter) query.status = statusFilter;

  const { data, isLoading, error, mutate } = usePlatformFeedback(query);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Reset to first page whenever the status filter changes.
  const changeFilter = (s: "" | "OPEN" | "RESOLVED") => {
    setStatusFilter(s);
    setPage(1);
  };
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const openReply = (id: string, existing?: string | null) => {
    setReplying(id);
    setReplyText(existing ?? "");
  };

  const submitReply = async (id: string) => {
    if (!replyText.trim()) return;
    setBusy(id);
    try {
      await apiClient.platformReplyFeedback(id, replyText.trim());
      toast.success("Reply sent");
      setReplying(null);
      setReplyText("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (id: string, status: "OPEN" | "RESOLVED") => {
    setBusy(id);
    try {
      await apiClient.platformSetFeedbackStatus(id, status);
      toast.success(status === "RESOLVED" ? "Marked resolved" : "Reopened");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--groups1-text)]">Feedback</h1>
        <div className="flex gap-1">
          {(["", "OPEN", "RESOLVED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                statusFilter === s
                  ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]"
                  : "border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              }`}
            >
              {s === "" ? "All" : s === "OPEN" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load feedback.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No feedback.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/platform/users/${f.user.id}`}
                      className="text-sm font-medium text-[var(--groups1-primary)] hover:underline"
                    >
                      {f.user.name || f.user.email}
                    </Link>
                    {f.user.name && (
                      <span className="text-xs text-[var(--groups1-text-secondary)]">{f.user.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                    <span className={`${BADGE} border-[var(--groups1-border)]`}>{f.type}</span>
                    <span
                      className={`${BADGE} ${
                        f.status === "OPEN"
                          ? "border-blue-500/40 text-blue-500"
                          : "border-emerald-500/40 text-emerald-600"
                      }`}
                    >
                      {f.status === "OPEN" ? "Open" : "Resolved"}
                    </span>
                    <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {replying !== f.id && (
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => openReply(f.id, f.reply)}
                      className="inline-flex items-center gap-1 text-xs border border-[var(--groups1-border)] rounded-lg px-2 py-1 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {f.reply ? "Edit reply" : "Reply"}
                    </button>
                  )}
                  {f.status === "OPEN" ? (
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => setStatus(f.id, "RESOLVED")}
                      className="inline-flex items-center gap-1 text-xs border border-[var(--groups1-border)] rounded-lg px-2 py-1 text-[var(--groups1-text-secondary)] hover:text-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => setStatus(f.id, "OPEN")}
                      className="text-xs border border-[var(--groups1-border)] rounded-lg px-2 py-1 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">{f.message}</p>

              {/* Existing reply */}
              {f.reply && (
                <div className="ml-3 pl-3 border-l-2 border-[var(--groups1-primary)]/40 space-y-0.5">
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    Reply{f.repliedAt ? ` · ${new Date(f.repliedAt).toLocaleDateString()}` : ""}
                  </p>
                  <p className="text-sm text-[var(--groups1-text)]">{f.reply}</p>
                </div>
              )}

              {/* Reply box */}
              {replying === f.id && (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write your reply…"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none resize-none"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setReplying(null)}
                      className="text-xs text-[var(--groups1-text-secondary)] px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!replyText.trim() || busy === f.id}
                      onClick={() => submitReply(f.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {busy === f.id ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </div>
              )}
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
