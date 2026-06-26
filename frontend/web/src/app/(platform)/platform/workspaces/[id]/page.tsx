"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Trash2, Copy } from "lucide-react";
import { usePlatformWorkspace } from "@/hooks/usePlatform";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { PLATFORM_FEATURES, FEATURE_LABEL, WORKSPACE_FIELD } from "@/lib/platform-features";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function WorkspaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data, isLoading, error, mutate } = usePlatformWorkspace(id);

  const [savingV2, setSavingV2] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Add-member form
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [addingMember, setAddingMember] = useState(false);
  const [memberTempPw, setMemberTempPw] = useState<string | null>(null);

  const { data: globalFeatures } = usePlatformFeatures();
  const globalOn = (f: string) => (globalFeatures ? globalFeatures.features[f] !== false : true);

  const toggleFeature = async (field: string, next: boolean) => {
    mutate((cur) => (cur ? ({ ...cur, [field]: next } as typeof cur) : cur), { revalidate: false });
    try {
      await apiClient.platformUpdateWorkspace(id, { [field]: next });
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      mutate();
    }
  };

  const toggleV2 = async (next: boolean) => {
    setSavingV2(true);
    mutate((cur) => (cur ? { ...cur, callSystemV2: next } : cur), { revalidate: false });
    try {
      await apiClient.platformUpdateWorkspace(id, { callSystemV2: next });
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      mutate();
    } finally {
      setSavingV2(false);
    }
  };

  const savePlan = async (plan: string) => {
    mutate((cur) => (cur ? { ...cur, plan } : cur), { revalidate: false });
    try {
      await apiClient.platformUpdateWorkspace(id, { plan });
      toast.success("Plan updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      mutate();
    }
  };

  const addMember = async () => {
    if (!memberEmail.trim()) return toast.error("Email required");
    setAddingMember(true);
    try {
      const res = await apiClient.platformAddMember(id, {
        role: memberRole,
        user: { mode: "existing", email: memberEmail },
      });
      toast.success("Member added");
      if (res.tempPassword) setMemberTempPw(res.tempPassword);
      setMemberEmail("");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const changeRole = async (memberId: string, role: string) => {
    try {
      await apiClient.platformChangeMemberRole(memberId, role);
      toast.success("Role updated");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const doDelete = async () => {
    if (confirmName !== data?.name) return;
    setDeleting(true);
    try {
      await apiClient.platformDeleteWorkspace(id);
      toast.success("Workspace deleted");
      router.push("/platform/workspaces");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !data) return <p className="text-sm text-red-500">Failed to load workspace.</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <Link href="/platform/workspaces" className="inline-flex items-center gap-1 text-sm text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">{data.name}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Members", value: data.memberCount },
          { label: "Students", value: data.studentCount },
          { label: "Call Lists", value: data.callListCount },
          { label: "Call Logs", value: data.callLogCount },
          { label: "Calls", value: data.callCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3">
            <div className="text-xs text-[var(--groups1-text-secondary)]">{s.label}</div>
            <div className="mt-1 text-xl font-bold text-[var(--groups1-text)]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">Settings</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--groups1-text-secondary)]">Plan</span>
          <select
            value={data.plan}
            onChange={(e) => savePlan(e.target.value)}
            className="px-2 py-1 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)]"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="BUSINESS">BUSINESS</option>
          </select>
        </div>
        <label className="flex items-center justify-between text-sm">
          <span className="text-[var(--groups1-text-secondary)]">Call System v2</span>
          <button
            type="button"
            disabled={savingV2}
            onClick={() => toggleV2(!data.callSystemV2)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              data.callSystemV2 ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-border)]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                data.callSystemV2 ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Features */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">Features</p>
        {PLATFORM_FEATURES.map((f) => {
          const field = WORKSPACE_FIELD[f];
          const on = (data as any)[field] !== false;
          return (
            <div key={f} className="flex items-center justify-between text-sm">
              <span className="text-[var(--groups1-text-secondary)]">{FEATURE_LABEL[f]}</span>
              {!globalOn(f) ? (
                <span className="text-xs px-2 py-0.5 rounded-lg border border-red-500/40 text-red-500">
                  DISABLED BY PLATFORM
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleFeature(field, !on)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    on ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-border)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      on ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">Members ({data.memberCount})</p>
        <div className="space-y-1">
          {data.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-[var(--groups1-text)]">{m.user.name || m.user.email}</span>
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value)}
                className="px-2 py-1 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-xs text-[var(--groups1-text)]"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t border-[var(--groups1-border)]">
          <input
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder="existing-user@email.com"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
          />
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value)}
            className="px-2 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)]"
          >
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            type="button"
            disabled={addingMember}
            onClick={addMember}
            className="px-3 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] text-sm font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {memberTempPw && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--groups1-text-secondary)]">Temp password:</span>
            <code className="px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">{memberTempPw}</code>
            <button type="button" onClick={() => { navigator.clipboard.writeText(memberTempPw); toast.success("Copied"); }}>
              <Copy className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/30 bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-red-500">Danger zone</p>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 text-sm text-red-500 border border-red-500/40 rounded-lg px-3 py-2 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" /> Delete workspace
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Type <strong>{data.name}</strong> to confirm. This soft-deletes the workspace (recoverable).
            </p>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={confirmName !== data.name || deleting}
                onClick={doDelete}
                className="flex items-center gap-1.5 text-sm text-white bg-red-500 rounded-lg px-3 py-2 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Confirm delete
              </button>
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setConfirmName(""); }}
                className="text-sm text-[var(--groups1-text-secondary)] px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
