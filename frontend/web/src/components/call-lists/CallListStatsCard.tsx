"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { CallListItem, CallListItemState } from "@/types/call-lists.types";

interface CallListStatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CallListItem[];
  isLoading?: boolean;
}

export function CallListStatsCard({
  className,
  items,
  isLoading = false,
  ...props
}: CallListStatsCardProps) {
  const stats = React.useMemo(() => {
    const total = items.length;
    const byState: Record<CallListItemState, number> = {
      QUEUED: 0,
      CALLING: 0,
      DONE: 0,
      SKIPPED: 0,
    };
    let assigned = 0;
    let unassigned = 0;

    items.forEach((item) => {
      byState[item.state] = (byState[item.state] || 0) + 1;
      if (item.assignedTo) {
        assigned++;
      } else {
        unassigned++;
      }
    });

    return {
      total,
      byState,
      assigned,
      unassigned,
      done: byState.DONE,
    };
  }, [items]);

  if (isLoading) {
    return (
      <Card variant="groups1" className={cn("", className)} {...props}>
        <CardContent variant="groups1" className="py-4">
          <div className="space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--groups1-secondary)]" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-[var(--groups1-secondary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="groups1" className={cn("", className)} {...props}>
      <CardContent variant="groups1" className="py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Stats in horizontal layout */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Total:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Queued:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.byState.QUEUED}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Done:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.byState.DONE}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Assigned:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.assigned}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Calling:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.byState.CALLING}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Skipped:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.byState.SKIPPED}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Unassigned:</span>
              <span className="text-sm font-semibold text-[var(--groups1-text)]">{stats.unassigned}</span>
            </div>
          </div>
          
          {/* Progress indicator - compact */}
          {stats.total > 0 && (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 bg-[var(--groups1-secondary)] rounded-full h-1">
                <div
                  className="bg-[var(--groups1-primary)] h-1 rounded-full transition-all"
                  style={{ width: `${(stats.done / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--groups1-text-secondary)] whitespace-nowrap">
                {stats.done}/{stats.total}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

