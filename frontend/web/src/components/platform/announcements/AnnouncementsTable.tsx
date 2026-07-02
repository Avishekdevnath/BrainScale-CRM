"use client";

import { useState } from "react";
import { Eye, Trash2, Search, Loader2 } from "lucide-react";
import type { Announcement } from "@/types/notifications.types";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";

interface AnnouncementsTableProps {
  items: Announcement[];
  isLoading: boolean;
  error: unknown;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onDelete: (announcement: Announcement) => void;
  deletingId: string | null;
}

export function AnnouncementsTable({
  items,
  isLoading,
  error,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onView,
  onDelete,
  deletingId,
}: AnnouncementsTableProps) {
  const [search, setSearch] = useState("");
  const visible = search.trim()
    ? items.filter((a) => a.title.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--groups1-text)]">Sent announcements</h2>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-xs text-[var(--groups1-text)] outline-none focus:border-[var(--groups1-primary)]"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {Boolean(error) && <p className="text-sm text-red-500">Failed to load announcements.</p>}
      {!isLoading && !error && visible.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          {search.trim() ? "No announcements match the search." : "No announcements sent yet."}
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--groups1-border)] text-left text-xs text-[var(--groups1-text-secondary)]">
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Recipients</th>
                <th className="px-4 py-2.5 font-medium">Read</th>
                <th className="px-4 py-2.5 font-medium">Sent by</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--groups1-border)]">
              {visible.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--groups1-primary)]/5">
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => onView(a.id)}
                      className="text-[var(--groups1-text)] font-medium hover:text-[var(--groups1-primary)] hover:underline text-left"
                    >
                      {a.title}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`${BADGE} ${
                        a.targetType === "ALL"
                          ? "border-sky-500/40 text-sky-500"
                          : "border-violet-500/40 text-violet-500"
                      }`}
                    >
                      {a.targetType === "ALL" ? "All workspaces" : `${a.workspaceIds.length} selected`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--groups1-text)]">{a.recipientCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--groups1-text)]">
                        {a.readCount ?? 0}
                        <span className="text-xs text-[var(--groups1-text-secondary)]">/{a.recipientCount}</span>
                      </span>
                      <div className="h-1.5 w-14 rounded-full bg-[var(--groups1-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${a.recipientCount > 0 ? Math.round(((a.readCount ?? 0) / a.recipientCount) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--groups1-text-secondary)] text-xs">
                    {a.sentBy.name || a.sentBy.email}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--groups1-text-secondary)] text-xs">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onView(a.id)}
                        title="View details"
                        className="p-1.5 rounded-lg text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] hover:bg-[var(--groups1-primary)]/10"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === a.id}
                        onClick={() => onDelete(a)}
                        title="Delete announcement"
                        className="p-1.5 rounded-lg text-[var(--groups1-text-secondary)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[var(--groups1-text-secondary)]">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
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
