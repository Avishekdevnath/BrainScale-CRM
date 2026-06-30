"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { Loader2, Phone, Calendar, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/types/call-lists.types";

interface PhoneHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null;
  studentName?: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  completed:  { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Completed" },
  missed:     { bg: "bg-red-500/10",     text: "text-red-600 dark:text-red-400",         label: "Missed" },
  busy:       { bg: "bg-yellow-500/10",  text: "text-yellow-700 dark:text-yellow-400",   label: "Busy" },
  no_answer:  { bg: "bg-orange-500/10",  text: "text-orange-600 dark:text-orange-400",   label: "No Answer" },
  voicemail:  { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400",       label: "Voicemail" },
  other:      { bg: "bg-gray-500/10",    text: "text-gray-600 dark:text-gray-400",       label: "Other" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAnswer(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean" || val === "true" || val === "false")
    return val === true || val === "true" ? "Yes" : "No";
  return String(val);
}

export function PhoneHistoryDrawer({ open, onOpenChange, phone, studentName }: PhoneHistoryDrawerProps) {
  const [logs, setLogs] = React.useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !phone) return;
    setIsLoading(true);
    setError(null);
    setLogs([]);
    apiClient
      .getCallLogs({ q: phone.replace(/\D/g, ""), size: 50 })
      .then((res) => {
        const sorted = [...res.logs].sort(
          (a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime()
        );
        setLogs(sorted);
      })
      .catch((err) => setError(err?.message || "Failed to load history"))
      .finally(() => setIsLoading(false));
  }, [open, phone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} mobileSheet>
      <DialogContent className="w-full max-w-full md:max-w-2xl rounded-t-2xl rounded-b-none md:rounded-lg h-[85dvh] md:h-auto md:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-[var(--groups1-border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Phone className="w-4 h-4" />
              Call history
              <span className="text-sm font-normal text-[var(--groups1-text-secondary)]">{phone}</span>
            </DialogTitle>
            <DialogClose onClose={() => onOpenChange(false)} />
          </div>
          {studentName && (
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">{studentName}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">{error}</p>
          )}
          {!isLoading && !error && logs.length === 0 && (
            <p className="text-sm text-[var(--groups1-text-secondary)] py-10 text-center">
              No prior calls for this number.
            </p>
          )}

          {!isLoading && logs.map((log, idx) => {
            const statusMeta = STATUS_COLORS[log.status] ?? { bg: "bg-gray-500/10", text: "text-gray-500", label: log.status };
            return (
              <div
                key={log.id}
                className={cn(
                  "rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 space-y-2",
                  idx === 0 && "border-[var(--groups1-primary)] border-2"
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--groups1-text)]">{formatDate(log.callDate)}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
                        Latest
                      </span>
                    )}
                    {(log as any).callNumber != null && (
                      <span className="font-mono text-[10px] text-[var(--groups1-text-secondary)]">#{(log as any).callNumber}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusMeta.bg, statusMeta.text)}>
                      {statusMeta.label}
                    </span>
                    {(log as any).callList?.name && (
                      <span className="text-[10px] text-[var(--groups1-text-secondary)] truncate max-w-[180px]">
                        {(log as any).callList.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Caller */}
                {log.assignee?.user?.name && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--groups1-text-secondary)]">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    Called by <span className="font-medium text-[var(--groups1-text)] ml-1">{log.assignee.user.name}</span>
                  </div>
                )}

                {/* Q&A */}
                {log.answers && log.answers.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                      <MessageSquare className="w-3 h-3" /> Q&amp;A
                    </div>
                    <div className="grid gap-1">
                      {log.answers.map((ans, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-[var(--groups1-background)] px-3 py-1.5 text-xs">
                          <span className="text-[var(--groups1-text-secondary)] flex-shrink-0 min-w-0 truncate max-w-[50%]">{ans.question}</span>
                          <span className="text-[var(--groups1-text)] font-medium flex-1">{formatAnswer(ans.answer)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up */}
                {log.followUpRequired && log.followUpDate && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 px-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <span className="text-xs text-orange-700 dark:text-orange-300">
                      Follow-up: {new Date(log.followUpDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
