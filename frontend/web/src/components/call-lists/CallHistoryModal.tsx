"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { Loader2, Calendar, MessageSquare, AlertCircle } from "lucide-react";
import type { CallListItem, CallLog } from "@/types/call-lists.types";
import { cn } from "@/lib/utils";

interface CallHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListItem: CallListItem | null;
}

export function CallHistoryModal({ open, onOpenChange, callListItem }: CallHistoryModalProps) {
  const [logs, setLogs] = React.useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !callListItem) return;

    setIsLoading(true);
    setError(null);
    setLogs([]);

    apiClient
      .getCallLogs({
        studentId: callListItem.studentId,
        size: 100,
      })
      .then((res) => {
        // newest first
        const sorted = [...res.logs].sort(
          (a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime()
        );
        setLogs(sorted);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load call history");
      })
      .finally(() => setIsLoading(false));
  }, [open, callListItem]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAnswer = (val: any): string => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (val === "true") return "Yes";
    if (val === "false") return "No";
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[var(--groups1-border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-[var(--groups1-text)]">
              Call History — {callListItem?.student?.name || "Student"}
            </DialogTitle>
            <DialogClose onClose={() => onOpenChange(false)} />
          </div>
          {callListItem?.student?.phones?.[0]?.phone && (
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">
              {callListItem.student.phones[0].phone}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm py-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--groups1-text-secondary)]">
              No call history yet
            </div>
          )}

          {!isLoading && logs.map((log, idx) => (
            <div
              key={log.id}
              className={cn(
                "rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3",
                idx === 0 && "border-[var(--groups1-primary)] border-2"
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--groups1-text)]">
                  <Calendar className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                  {formatDate(log.callDate)}
                  {idx === 0 && (
                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-[var(--groups1-text-secondary)] capitalize">
                    {log.status?.replace(/_/g, " ")}
                  </span>
                  {(log as any).callList?.name && (
                    <span className="text-[10px] text-[var(--groups1-text-secondary)] truncate max-w-[180px]">
                      {(log as any).callList.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Q&A */}
              {log.answers && log.answers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Q&amp;A
                  </div>
                  <div className="grid gap-1.5">
                    {log.answers.map((ans, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-[var(--groups1-background)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--groups1-text-secondary)] flex-shrink-0 min-w-0 truncate max-w-[50%]">
                          {ans.question}
                        </span>
                        <span className="text-[var(--groups1-text)] font-medium flex-1">
                          {formatAnswer(ans.answer)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up note */}
              {log.followUpRequired && (log.followUpDate || log.followUpNote || (log.notes && log.notes.includes("--- Follow-up Note ---"))) && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 px-3 py-2 space-y-1">
                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                    Follow-up
                  </div>
                  {log.followUpDate && (
                    <div className="text-sm text-orange-800 dark:text-orange-300">
                      Date: {new Date(log.followUpDate).toLocaleDateString()}
                    </div>
                  )}
                  {log.followUpNote && (
                    <div className="text-sm text-orange-800 dark:text-orange-300 whitespace-pre-wrap">
                      {log.followUpNote}
                    </div>
                  )}
                  {!log.followUpNote && log.notes?.includes("--- Follow-up Note ---") && (
                    <div className="text-sm text-orange-800 dark:text-orange-300 whitespace-pre-wrap">
                      {log.notes.split("--- Follow-up Note ---")[1]?.trim()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
