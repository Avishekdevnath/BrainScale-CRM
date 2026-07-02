"use client";

import { useState } from "react";
import { Loader2, Megaphone, Send, Search } from "lucide-react";
import { usePlatformWorkspaces } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { AnnouncementRichEditor } from "./AnnouncementRichEditor";
import { RichTextView, isRichDoc } from "@/components/announcements/RichTextView";

const TITLE_MAX = 200;
const BODY_MAX = 2000;

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none focus:border-[var(--groups1-primary)]";

interface AnnouncementComposerProps {
  onSent: () => void;
  onCancel: () => void;
}

export function AnnouncementComposer({ onSent, onCancel }: AnnouncementComposerProps) {
  const [title, setTitle] = useState("");
  const [bodyRich, setBodyRich] = useState<unknown>(null);
  const [bodyPlain, setBodyPlain] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [sending, setSending] = useState(false);

  const { data: workspacesData } = usePlatformWorkspaces({ size: 100 });
  const workspaces = workspacesData?.items ?? [];
  const visibleWorkspaces = workspaceSearch.trim()
    ? workspaces.filter((w) => w.name.toLowerCase().includes(workspaceSearch.trim().toLowerCase()))
    : workspaces;

  const selectedRecipientEstimate =
    targetType === "ALL"
      ? workspaces.reduce((sum, w) => sum + w.memberCount, 0)
      : workspaces.filter((w) => selectedIds.includes(w.id)).reduce((sum, w) => sum + w.memberCount, 0);

  const canSend =
    title.trim().length > 0 &&
    bodyPlain.trim().length > 0 &&
    bodyPlain.length <= BODY_MAX &&
    (targetType === "ALL" || selectedIds.length > 0) &&
    !sending;

  const toggleWorkspace = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await apiClient.platformCreateAnnouncement({
        title: title.trim(),
        body: bodyPlain.trim(),
        ...(isRichDoc(bodyRich) ? { bodyRich } : {}),
        targetType,
        ...(targetType === "SELECTED" ? { workspaceIds: selectedIds } : {}),
      });
      toast.success(
        `Announcement sent to ${result.recipientCount} member${result.recipientCount === 1 ? "" : "s"}`
      );
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--groups1-text-secondary)]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="Scheduled maintenance…"
              className={INPUT}
            />
            <p className="text-right text-xs text-[var(--groups1-text-secondary)]">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--groups1-text-secondary)]">Message</label>
            <AnnouncementRichEditor
              onChange={(json, plainText) => {
                setBodyRich(json);
                setBodyPlain(plainText);
              }}
            />
            <p className={`text-right text-xs ${bodyPlain.length > BODY_MAX ? "text-red-500" : "text-[var(--groups1-text-secondary)]"}`}>
              {bodyPlain.length}/{BODY_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--groups1-text-secondary)]">Target</label>
            <div className="flex items-center gap-4 text-sm text-[var(--groups1-text)]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={targetType === "ALL"} onChange={() => setTargetType("ALL")} />
                All workspaces
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={targetType === "SELECTED"} onChange={() => setTargetType("SELECTED")} />
                Selected workspaces
              </label>
            </div>

            {targetType === "SELECTED" && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
                  <input
                    value={workspaceSearch}
                    onChange={(e) => setWorkspaceSearch(e.target.value)}
                    placeholder="Search workspaces…"
                    className={`${INPUT} pl-8 py-1.5 text-xs`}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--groups1-border)] divide-y divide-[var(--groups1-border)]">
                  {visibleWorkspaces.length === 0 && (
                    <p className="p-3 text-xs text-[var(--groups1-text-secondary)]">No workspaces found.</p>
                  )}
                  {visibleWorkspaces.map((w) => (
                    <label
                      key={w.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--groups1-text)] cursor-pointer hover:bg-[var(--groups1-primary)]/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(w.id)}
                        onChange={() => toggleWorkspace(w.id)}
                      />
                      <span className="flex-1 truncate">{w.name}</span>
                      <span className="text-xs text-[var(--groups1-text-secondary)] shrink-0">
                        {w.memberCount} member{w.memberCount === 1 ? "" : "s"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--groups1-text-secondary)]">
            Preview — members see this modal on app open (auto-closes after 10 seconds)
          </p>
          <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-background)] p-6 lg:p-10">
            <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 shadow-sm space-y-3 max-w-sm mx-auto">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                  <Megaphone className="h-4 w-4 text-sky-500" />
                </span>
                <p className="text-sm font-semibold text-[var(--groups1-text)] break-words">
                  {title.trim() || "Announcement title"}
                </p>
              </div>
              {isRichDoc(bodyRich) && bodyPlain.trim() ? (
                <RichTextView doc={bodyRich} className="space-y-2 text-sm text-[var(--groups1-text-secondary)] break-words" />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-[var(--groups1-text-secondary)] break-words">
                  Your message appears here.
                </p>
              )}
              <div className="flex justify-end">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
                  Got it
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--groups1-text-secondary)]">
            Estimated recipients:{" "}
            <span className="font-semibold text-[var(--groups1-text)]">{selectedRecipientEstimate}</span>
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={onCancel}
          className="text-xs px-4 py-2 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        >
          Cancel
        </button>
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
  );
}
