"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCallLogs } from "@/hooks/useCallLogs";
import { PhoneHistoryDrawer } from "@/components/calls/PhoneHistoryDrawer";
import { Loader2, ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallLog, GetCallLogsParams } from "@/types/call-lists.types";
import { useFeature } from "@/hooks/usePlatformFeatures";

export interface CallsTableProps {
  callListId?: string | null;
  searchQuery?: string;
  status?: string | null;
  assignedTo?: string | null;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Completed" },
  missed:    { bg: "bg-red-500/10",     text: "text-red-600 dark:text-red-400",         label: "Missed" },
  busy:      { bg: "bg-yellow-500/10",  text: "text-yellow-700 dark:text-yellow-400",   label: "Busy" },
  no_answer: { bg: "bg-orange-500/10",  text: "text-orange-600 dark:text-orange-400",   label: "No Answer" },
  voicemail: { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400",       label: "Voicemail" },
  other:     { bg: "bg-gray-500/10",    text: "text-gray-600 dark:text-gray-400",       label: "Other" },
};

function callSummary(log: CallLog): string | null {
  return log.summaryNote?.trim() || log.callerNote?.trim() || log.notes?.trim() || null;
}

export function CallsTable({ callListId, searchQuery = "", status, assignedTo, onRefresh }: CallsTableProps) {
  const router = useRouter();
  const followupsFeature = useFeature("followups");
  const [historyPhone, setHistoryPhone] = React.useState<{ phone: string; name?: string | null } | null>(null);
  const [openSummaryId, setOpenSummaryId] = React.useState<string | null>(null);
  const [pageSize] = React.useState<number>(20);
  const [page, setPage] = React.useState<number>(1);

  const params: GetCallLogsParams = React.useMemo(() => ({
    page,
    size: pageSize,
    callListId: callListId || undefined,
    q: searchQuery.trim() || undefined,
    status: (status as any) || undefined,
    assignedTo: assignedTo || undefined,
  }), [page, pageSize, callListId, searchQuery, status, assignedTo]);

  React.useEffect(() => { setPage(1); }, [callListId, searchQuery, status, assignedTo]);

  const { data, isLoading, error } = useCallLogs(params);

  const logs = data?.logs || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  const thClass = "text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap";
  const tdClass = "py-2 px-3 text-xs text-[var(--groups1-text)]";

  return (
    <>
      <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : "Failed to load calls"}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--groups1-text-secondary)]">
            No calls found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/40">
                    <th className={thClass}>ID</th>
                    <th className={thClass}>Student</th>
                    <th className={thClass}>Phone</th>
                    <th className={thClass}>Call List</th>
                    <th className={thClass}>Batch</th>
                    <th className={thClass}>Caller</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Summary</th>
                    {followupsFeature.enabled && <th className={thClass}>Follow-up</th>}
                    <th className={thClass}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const student = log.student;
                    const callList = log.callList;
                    const statusMeta = STATUS_COLORS[log.status] ?? { bg: "bg-gray-500/10", text: "text-gray-500", label: log.status };

                    return (
                      <tr key={log.id} className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]/50 transition-colors">
                        <td className={tdClass}>
                          {log.callNumber != null
                            ? <span className="font-mono text-[11px] text-[var(--groups1-text-secondary)]">#{log.callNumber}</span>
                            : <span className="text-[var(--groups1-text-secondary)]">—</span>
                          }
                        </td>
                        <td className={tdClass}>
                          {student?.id ? (
                            <button
                              onClick={() => router.push(`/app/students/${student.id}`)}
                              className="text-[var(--groups1-primary)] hover:underline font-medium"
                            >
                              {student.name || "Unknown"}
                            </button>
                          ) : (
                            <span>{student?.name || "Unknown"}</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          {student?.phones?.length ? (() => {
                            const phone = student.phones.find((p) => p.isPrimary) ?? student.phones[0];
                            return (
                              <div className="flex items-center gap-1.5">
                                <a href={`tel:${phone.phone}`} className="text-[var(--groups1-primary)] hover:underline">
                                  {phone.phone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setHistoryPhone({ phone: phone.phone, name: student.name })}
                                  className="text-[10px] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] hover:underline"
                                  title="Call history"
                                >
                                  history
                                </button>
                              </div>
                            );
                          })() : <span className="text-[var(--groups1-text-secondary)]">N/A</span>}
                        </td>
                        <td className={tdClass}>{callList?.name || "—"}</td>
                        <td className={tdClass}>{(callList?.group as any)?.batch?.name || "—"}</td>
                        <td className={tdClass}>
                          {log.assignee
                            ? log.assignee.user.name?.trim() || log.assignee.user.email
                            : <span className="text-[var(--groups1-text-secondary)]">—</span>}
                        </td>
                        <td className={tdClass}>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusMeta.bg, statusMeta.text)}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className={cn(tdClass, "max-w-[260px]")}>
                          {(() => {
                            const summary = callSummary(log);
                            if (!summary) {
                              return <span className="text-[var(--groups1-text-secondary)]">—</span>;
                            }
                            const isOpen = openSummaryId === log.id;
                            return (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenSummaryId(isOpen ? null : log.id)}
                                  className="block w-full truncate text-left text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                                >
                                  {summary}
                                </button>
                                {isOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setOpenSummaryId(null)} />
                                    <div className="absolute top-full left-0 mt-1.5 z-50 w-80 max-w-[80vw] bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg p-3">
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)]">
                                          Summary
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setOpenSummaryId(null)}
                                          className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-xs text-[var(--groups1-text)] whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                                        {summary}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {followupsFeature.enabled && (
                          <td className={tdClass}>
                            {log.followUpRequired && log.followUpDate ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/25">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                {new Date(log.followUpDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[var(--groups1-text-secondary)]">—</span>
                            )}
                          </td>
                        )}
                        <td className={cn(tdClass, "text-[var(--groups1-text-secondary)] whitespace-nowrap")}>
                          {new Date(log.callDate).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--groups1-border)]">
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  {logs.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalItems)} of {totalItems}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                      className="p-1 rounded-lg text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-[var(--groups1-text-secondary)] px-1">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || isLoading}
                      className="p-1 rounded-lg text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <PhoneHistoryDrawer
        open={historyPhone !== null}
        onOpenChange={(open) => { if (!open) setHistoryPhone(null); }}
        phone={historyPhone?.phone ?? null}
        studentName={historyPhone?.name ?? null}
      />
    </>
  );
}
