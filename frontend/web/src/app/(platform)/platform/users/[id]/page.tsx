"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Pencil, Check, X, KeyRound, Copy } from "lucide-react";
import { usePlatformUser } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";

export default function PlatformUserDetailPage() {
  const id = useParams().id as string;
  const { data, isLoading, error, mutate } = usePlatformUser(id);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);

  const saveName = async () => {
    setBusy(true);
    try {
      await apiClient.platformUpdateUser(id, { name: name.trim() });
      toast.success("Name updated");
      setEditing(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const toggleStatus = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await apiClient.platformSetUserStatus(id, !!data.disabledAt);
      toast.success(data.disabledAt ? "Reactivated" : "Deactivated");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const resetPw = async () => {
    setBusy(true);
    try {
      const res = await apiClient.platformResetUserPassword(id);
      setTempPw(res.tempPassword);
      toast.success("Password reset");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !data) return <p className="text-sm text-red-500">Failed to load user.</p>;

  const badges: Array<{ label: string; cls: string }> = [];
  if (data.isSuperAdmin) badges.push({ label: "Super Admin", cls: "border-[var(--groups1-primary)] text-[var(--groups1-primary)]" });
  if (data.health.isDeactivated) badges.push({ label: "Deactivated", cls: "border-red-500/40 text-red-500" });
  if (data.health.isPendingSetup) badges.push({ label: "Pending Setup", cls: "border-amber-500/40 text-amber-500" });
  if (data.health.noWorkspace) badges.push({ label: "No Workspace", cls: "border-amber-500/40 text-amber-500" });
  if (data.health.hasOpenFeedback) badges.push({ label: "Open Feedback", cls: "border-blue-500/40 text-blue-500" });

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/platform/users"
        className="inline-flex items-center gap-1 text-sm text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Header */}
      <div className="space-y-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
            />
            <button
              type="button"
              disabled={busy}
              onClick={saveName}
              className="text-emerald-600"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[var(--groups1-text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--groups1-text)]">{data.name || "—"}</h1>
            <button
              type="button"
              onClick={() => { setName(data.name ?? ""); setEditing(true); }}
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <p className="text-sm text-[var(--groups1-text-secondary)]">{data.email}</p>
      </div>

      {/* Health badges */}
      <div className="flex flex-wrap gap-2">
        {badges.length === 0 ? (
          <span className={`${BADGE} border-emerald-500/40 text-emerald-600`}>Healthy</span>
        ) : (
          badges.map((b) => (
            <span key={b.label} className={`${BADGE} ${b.cls}`}>{b.label}</span>
          ))
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={toggleStatus}
          className="text-xs border border-[var(--groups1-border)] rounded-lg px-2 py-1 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        >
          {data.disabledAt ? "Reactivate" : "Deactivate"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={resetPw}
          className="inline-flex items-center gap-1 text-xs border border-[var(--groups1-border)] rounded-lg px-2 py-1 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        >
          <KeyRound className="w-3.5 h-3.5" /> Reset password
        </button>
      </div>

      {tempPw && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--groups1-text-secondary)]">Temp password:</span>
          <code className="px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">{tempPw}</code>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(tempPw); toast.success("Copied"); }}
          >
            <Copy className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
          </button>
        </div>
      )}

      {/* Workspaces */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-2">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">
          Workspaces ({data.workspaces.length})
        </p>
        {data.workspaces.length === 0 ? (
          <p className="text-xs text-[var(--groups1-text-secondary)]">No workspace memberships.</p>
        ) : (
          data.workspaces.map((w) => (
            <div key={w.id} className="flex items-center justify-between text-sm">
              <Link
                href={`/platform/workspaces/${w.id}`}
                className="text-[var(--groups1-primary)] hover:underline"
              >
                {w.name}
              </Link>
              <span className="text-xs text-[var(--groups1-text-secondary)]">
                {w.role} · {w.plan}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Feedback history */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">
          Feedback ({data.feedback.length})
        </p>
        {data.feedback.length === 0 ? (
          <p className="text-xs text-[var(--groups1-text-secondary)]">No feedback submitted.</p>
        ) : (
          data.feedback.map((f) => (
            <div key={f.id} className="border-t border-[var(--groups1-border)] pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                <span className={`${BADGE} border-[var(--groups1-border)]`}>{f.type}</span>
                <span
                  className={`${BADGE} ${
                    f.status === "OPEN"
                      ? "border-blue-500/40 text-blue-500"
                      : "border-emerald-500/40 text-emerald-600"
                  }`}
                >
                  {f.status}
                </span>
                <span>{new Date(f.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-[var(--groups1-text)] mt-1">{f.message}</p>
              {f.reply && (
                <div className="mt-2 ml-3 pl-3 border-l-2 border-[var(--groups1-primary)]/40">
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    Reply{f.repliedAt ? ` · ${new Date(f.repliedAt).toLocaleDateString()}` : ""}
                  </p>
                  <p className="text-sm text-[var(--groups1-text)]">{f.reply}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
