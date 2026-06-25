"use client";

import { useState } from "react";
import { Loader2, Search, Copy, KeyRound, ShieldCheck, Shield } from "lucide-react";
import { usePlatformUsers } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function PlatformUsersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error, mutate } = usePlatformUsers({ q: q || undefined, size: 100 });
  const [busy, setBusy] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<{ email: string; pw: string } | null>(null);

  const toggleSuperAdmin = async (id: string, next: boolean) => {
    setBusy(id);
    try {
      await apiClient.platformSetSuperAdmin(id, next);
      toast.success(next ? "Granted super-admin" : "Revoked super-admin");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (id: string, active: boolean) => {
    setBusy(id);
    try {
      await apiClient.platformSetUserStatus(id, active);
      toast.success(active ? "User reactivated" : "User deactivated");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (id: string, email: string) => {
    setBusy(id);
    try {
      const res = await apiClient.platformResetUserPassword(id);
      setTempPw({ email, pw: res.tempPassword });
      toast.success("Password reset");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">Users</h1>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)]">
        <Search className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 bg-transparent outline-none text-sm text-[var(--groups1-text)]"
        />
      </div>

      {tempPw && (
        <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 flex items-center gap-2 text-sm">
          <span className="text-[var(--groups1-text-secondary)]">Temp password for {tempPw.email}:</span>
          <code className="px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">{tempPw.pw}</code>
          <button type="button" onClick={() => { navigator.clipboard.writeText(tempPw.pw); toast.success("Copied"); }}>
            <Copy className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
          </button>
          <button type="button" className="ml-auto text-xs text-[var(--groups1-text-secondary)]" onClick={() => setTempPw(null)}>dismiss</button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load users.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No users found.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Workspaces</th>
                <th className="px-4 py-2 font-medium">Super-admin</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const disabled = !!u.disabledAt;
                return (
                  <tr key={u.id} className="border-t border-[var(--groups1-border)]">
                    <td className="px-4 py-2">
                      <div className="text-[var(--groups1-text)]">{u.name || "—"}</div>
                      <div className="text-xs text-[var(--groups1-text-secondary)]">{u.email}</div>
                    </td>
                    <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{u.workspaceCount}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={busy === u.id}
                        onClick={() => toggleSuperAdmin(u.id, !u.isSuperAdmin)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                          u.isSuperAdmin
                            ? "border-[var(--groups1-primary)] text-[var(--groups1-primary)] bg-[var(--groups1-primary)]/10"
                            : "border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]"
                        }`}
                      >
                        {u.isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        {u.isSuperAdmin ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs ${disabled ? "text-red-500" : "text-green-600"}`}>
                        {disabled ? "Deactivated" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        disabled={busy === u.id}
                        onClick={() => toggleStatus(u.id, disabled)}
                        className="text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-[var(--groups1-border)] rounded-lg px-2 py-1"
                      >
                        {disabled ? "Reactivate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === u.id}
                        onClick={() => resetPassword(u.id, u.email)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-[var(--groups1-border)] rounded-lg px-2 py-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
