"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, RotateCcw, Trash2 } from "lucide-react";
import { usePlatformWorkspaces, usePlatformDeletedWorkspaces } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function PlatformWorkspacesPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error, mutate } = usePlatformWorkspaces({ q: q || undefined, size: 100 });
  const { data: deleted, mutate: mutateDeleted } = usePlatformDeletedWorkspaces();
  const [restoring, setRestoring] = useState<string | null>(null);

  const onRestore = async (id: string) => {
    setRestoring(id);
    try {
      await apiClient.platformRestoreWorkspace(id);
      toast.success("Workspace restored");
      mutateDeleted();
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setRestoring(null);
    }
  };
  const [toggling, setToggling] = useState<string | null>(null);

  const onToggle = async (id: string, next: boolean) => {
    setToggling(id);
    // Optimistic update
    mutate(
      (cur) =>
        cur
          ? { ...cur, items: cur.items.map((w) => (w.id === id ? { ...w, callSystemV2: next } : w)) }
          : cur,
      { revalidate: false },
    );
    try {
      await apiClient.platformUpdateWorkspace(id, { callSystemV2: next });
      toast.success(`Call System ${next ? "v2" : "v1"} for workspace`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
      mutate(); // rollback by refetch
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--groups1-text)]">Workspaces</h1>
        <Link
          href="/platform/workspaces/new"
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <Plus className="w-4 h-4" /> Create workspace
        </Link>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)]">
        <Search className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search workspaces…"
          className="flex-1 bg-transparent outline-none text-sm text-[var(--groups1-text)]"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load workspaces.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No workspaces found.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Students</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Call System v2</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((w) => (
                <tr key={w.id} className="border-t border-[var(--groups1-border)]">
                  <td className="px-4 py-2 text-[var(--groups1-text)]">{w.name}</td>
                  <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{w.memberCount}</td>
                  <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{w.studentCount}</td>
                  <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{w.plan}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      disabled={toggling === w.id}
                      onClick={() => onToggle(w.id, !w.callSystemV2)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        w.callSystemV2 ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-border)]"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          w.callSystemV2 ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/platform/workspaces/${w.id}`}
                      className="text-[var(--groups1-primary)] hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deleted workspaces */}
      {deleted && deleted.length > 0 && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)]">
            <Trash2 className="w-4 h-4" />
            <h2 className="text-sm font-semibold">Deleted workspaces ({deleted.length})</h2>
          </div>
          <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Deleted</th>
                  <th className="px-4 py-2 font-medium">Members</th>
                  <th className="px-4 py-2 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {deleted.map((w) => (
                  <tr key={w.id} className="border-t border-[var(--groups1-border)]">
                    <td className="px-4 py-2 text-[var(--groups1-text)]">{w.name}</td>
                    <td className="px-4 py-2 text-[var(--groups1-text-secondary)] whitespace-nowrap">
                      {new Date(w.deletedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{w.memberCount}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        disabled={restoring === w.id}
                        onClick={() => onRestore(w.id)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--groups1-primary)] border border-[var(--groups1-border)] rounded-lg px-2 py-1 hover:bg-[var(--groups1-secondary)] disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
