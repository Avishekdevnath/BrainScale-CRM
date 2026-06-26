"use client";

import { useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { usePlatformAudit } from "@/hooks/usePlatform";

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const size = 50;
  const { data, isLoading, error } = usePlatformAudit({ page, size });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / size)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">Audit Log</h1>
      <p className="text-sm text-[var(--groups1-text-secondary)]">
        Every super-admin action across the platform.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load audit log.</p>}
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No audit entries yet.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Actor</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--groups1-border)] align-top">
                    <td className="px-4 py-2 text-[var(--groups1-text-secondary)] whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-[var(--groups1-text)]">
                      {a.actor?.name || a.actor?.email || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">
                        {a.action}
                      </code>
                    </td>
                    <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">
                      {a.targetType}
                      {a.targetId ? <span className="text-xs"> · {a.targetId}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--groups1-text-secondary)]">
              Page {page} of {totalPages} · {data.total} entries
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-[var(--groups1-border)] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-[var(--groups1-border)] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
