"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAllCalls } from "@/hooks/useMyCalls";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone } from "lucide-react";
import type { CallListItem, CallListItemState } from "@/types/call-lists.types";

interface PhoneHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null;
  studentName?: string | null;
}

function normalizeDigits(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function PhoneHistoryDrawer({ open, onOpenChange, phone, studentName }: PhoneHistoryDrawerProps) {
  const digits = phone ? normalizeDigits(phone) : "";
  const { data, isLoading, error } = useAllCalls(
    open && digits ? { q: digits, page: 1, size: 50 } : undefined,
  );

  const items = data?.items || [];

  const variantFor = (state: CallListItemState): "success" | "warning" | "info" | "error" => {
    const c = getStateColor(state);
    if (c === "green") return "success";
    if (c === "blue") return "info";
    if (c === "red") return "error";
    return "warning";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} mobileSheet>
      <DialogContent className="w-full max-w-full md:max-w-2xl rounded-t-2xl rounded-b-none md:rounded-lg h-[80dvh] md:h-auto md:max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-[var(--groups1-border)] mb-0">
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <Phone className="w-4 h-4" />
            Call history
            <span className="text-sm font-normal text-[var(--groups1-text-secondary)]">{phone}</span>
          </DialogTitle>
          {studentName && (
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">{studentName}</p>
          )}
        </DialogHeader>
        <DialogClose onClose={() => onOpenChange(false)} />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">
              {error instanceof Error ? error.message : "Failed to load history"}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--groups1-text-secondary)] py-10 text-center">
              No prior calls for this number.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--groups1-border)]">
              {items.map((item: CallListItem) => {
                const lastLog = item.callLog;
                const callDate = lastLog?.callDate || item.updatedAt || item.createdAt;
                return (
                  <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--groups1-text)] truncate">
                          {item.student?.name || "Unknown"}
                        </span>
                        <StatusBadge variant={variantFor(item.state)}>
                          {getStateLabel(item.state)}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5 truncate">
                        {item.callList?.name || "—"}
                        {item.assignee?.user?.name ? ` · ${item.assignee.user.name}` : ""}
                      </p>
                      {lastLog?.notes && (
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1 line-clamp-2">
                          {lastLog.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--groups1-text-secondary)] flex-shrink-0">
                      {new Date(callDate).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
