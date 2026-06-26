"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePlatformFeatures, usePlatformFeatureWorkspaces } from "@/hooks/usePlatformFeatures";
import { PLATFORM_FEATURES, FEATURE_LABEL, WORKSPACE_FIELD } from "@/lib/platform-features";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-border)]"
      }`}
    >
      <span className={`h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function PlatformFeaturesPage() {
  const { data: global, mutate: mutateGlobal } = usePlatformFeatures();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const wsQuery: Record<string, string | number | undefined> = { size: PAGE_SIZE, page };
  if (search) wsQuery.q = search;
  const { data: ws, isLoading, mutate: mutateWs } = usePlatformFeatureWorkspaces(wsQuery);
  const [busy, setBusy] = useState<string | null>(null);

  const totalPages = ws ? Math.max(1, Math.ceil(ws.total / PAGE_SIZE)) : 1;

  const toggleGlobal = async (feature: string, next: boolean) => {
    setBusy(`g:${feature}`);
    try {
      await apiClient.updatePlatformFeatures(feature, next);
      toast.success(`${FEATURE_LABEL[feature as keyof typeof FEATURE_LABEL]} ${next ? "enabled" : "disabled"} globally`);
      mutateGlobal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const toggleWorkspace = async (id: string, feature: keyof typeof WORKSPACE_FIELD, next: boolean) => {
    setBusy(`${id}:${feature}`);
    try {
      await apiClient.platformUpdateWorkspace(id, { [WORKSPACE_FIELD[feature]]: next });
      toast.success("Workspace updated");
      mutateWs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const globalOn = (f: string) => (global ? global.features[f] !== false : true);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">Features</h1>

      {/* Global flags */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--groups1-text)]">Global Feature Flags</p>
        {PLATFORM_FEATURES.map((f) => (
          <div key={f} className="flex items-center justify-between">
            <span className="text-sm text-[var(--groups1-text)]">{FEATURE_LABEL[f]}</span>
            <Toggle
              on={globalOn(f)}
              disabled={busy === `g:${f}`}
              onClick={() => toggleGlobal(f, !globalOn(f))}
            />
          </div>
        ))}
      </div>

      {/* Per-workspace overrides */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--groups1-text)]">Per-Workspace Overrides</p>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search workspaces…"
            className="px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
          />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {ws && ws.items.length === 0 && (
          <p className="text-sm text-[var(--groups1-text-secondary)]">No workspaces.</p>
        )}

        {ws && ws.items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-[var(--groups1-text-secondary)]">
              <tr>
                <th className="py-2 font-medium">Workspace</th>
                {PLATFORM_FEATURES.map((f) => (
                  <th key={f} className={`py-2 font-medium text-center ${!globalOn(f) ? "opacity-40" : ""}`}>
                    {FEATURE_LABEL[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.items.map((w) => (
                <tr key={w.id} className="border-t border-[var(--groups1-border)]">
                  <td className="py-2">
                    <Link href={`/platform/workspaces/${w.id}`} className="text-[var(--groups1-primary)] hover:underline">
                      {w.name}
                    </Link>
                  </td>
                  {PLATFORM_FEATURES.map((f) => {
                    const field = WORKSPACE_FIELD[f];
                    const on = (w as any)[field] !== false;
                    return (
                      <td key={f} className="py-2 text-center">
                        <Toggle
                          on={on}
                          disabled={!globalOn(f) || busy === `${w.id}:${f}`}
                          onClick={() => toggleWorkspace(w.id, f, !on)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {ws && ws.total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--groups1-text-secondary)]">
              Page {page} of {totalPages} · {ws.total} total
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
