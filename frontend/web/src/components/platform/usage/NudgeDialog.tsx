"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface NudgeTarget {
  id: string;
  email: string;
  name: string | null;
  inCooldown: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  targets: NudgeTarget[];
  defaults: { subject: string; body: string };
  onSent: () => void;
}

export default function NudgeDialog({ open, onClose, targets, defaults, onSent }: Props) {
  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: string[]; skipped: string[]; failed: string[] } | null>(null);

  useEffect(() => {
    if (open) {
      setSubject(defaults.subject);
      setBody(defaults.body);
      setResult(null);
    }
  }, [open, defaults.subject, defaults.body]);

  if (!open) return null;

  const cooldownCount = targets.filter((t) => t.inCooldown).length;
  const edited = subject !== defaults.subject || body !== defaults.body;

  const send = async () => {
    setSending(true);
    try {
      const res = await apiClient.platformSendNudges({
        userIds: targets.map((t) => t.id),
        // Untouched text => omit so the server uses its rich HTML template.
        ...(edited ? { subject, body } : {}),
      });
      setResult(res);
      toast.success(`Sent ${res.sent.length}, skipped ${res.skipped.length}, failed ${res.failed.length}`);
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[var(--groups1-primary)]" />
          <h2 className="text-sm font-bold text-[var(--groups1-text)]">
            Send nudge to {targets.length} {targets.length === 1 ? "user" : "users"}
          </h2>
        </div>

        <p className="text-xs text-[var(--groups1-text-secondary)]">
          {"{{name}}"} is replaced per recipient.
          {cooldownCount > 0 && ` ${cooldownCount} selected ${cooldownCount === 1 ? "user is" : "users are"} in cooldown and will be skipped.`}
        </p>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none resize-y"
        />

        {result && (
          <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] p-2 text-xs text-[var(--groups1-text-secondary)]">
            Sent {result.sent.length} · Skipped (cooldown) {result.skipped.length} · Failed {result.failed.length}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-sm text-[var(--groups1-text-secondary)] px-3 py-2">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              disabled={sending || !subject.trim() || !body.trim()}
              onClick={send}
              className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg text-white bg-[var(--groups1-primary)] disabled:opacity-50"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              {sending ? "Sending…" : "Send"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
