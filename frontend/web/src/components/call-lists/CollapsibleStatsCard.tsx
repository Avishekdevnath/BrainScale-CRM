"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { CallListItem } from "@/types/call-lists.types";

interface CollapsibleStatsCardProps {
  items: CallListItem[];
  isLoading?: boolean;
}

export function CollapsibleStatsCard({ items, isLoading = false }: CollapsibleStatsCardProps) {
  const stats = React.useMemo(() => {
    const total = items.length;
    const byState = { QUEUED: 0, CALLING: 0, DONE: 0, SKIPPED: 0 };
    let assigned = 0;
    let unassigned = 0;

    items.forEach((item) => {
      byState[item.state] = (byState[item.state] || 0) + 1;
      if (item.assignedTo) assigned++;
      else unassigned++;
    });

    return { total, byState, assigned, unassigned };
  }, [items]);

  const pct = stats.total > 0 ? Math.round((stats.byState.DONE / stats.total) * 100) : 0;

  const statCells = [
    { label: "Total", value: stats.total, color: undefined },
    { label: "Queued", value: stats.byState.QUEUED, color: undefined },
    { label: "Calling", value: stats.byState.CALLING, color: stats.byState.CALLING > 0 ? "text-blue-600 dark:text-blue-400" : undefined },
    { label: "Done", value: stats.byState.DONE, color: stats.byState.DONE > 0 ? "text-green-600 dark:text-green-400" : undefined },
    { label: "Skipped", value: stats.byState.SKIPPED, color: stats.byState.SKIPPED > 0 ? "text-amber-600 dark:text-amber-400" : undefined },
    { label: "Assigned", value: stats.assigned, color: undefined },
    { label: "Unassigned", value: stats.unassigned, color: stats.unassigned > 0 ? "text-amber-600 dark:text-amber-400" : undefined },
  ];

  return (
    <Card variant="groups1">
      <CardContent variant="groups1" className="py-1.5 px-4">
        <div className="flex items-center gap-4">
          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="flex items-center gap-2 min-w-[140px]">
              <div className="flex-1 bg-[var(--groups1-secondary)] rounded-full h-1.5">
                <div
                  className="bg-[var(--groups1-primary)] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-[var(--groups1-text)]">
                {pct}%
              </span>
            </div>
          )}

          {/* Divider */}
          {stats.total > 0 && (
            <div className="h-6 w-px bg-[var(--groups1-border)]" />
          )}

          {/* 7 stat cells */}
          <div className="flex items-center gap-0 flex-1 overflow-x-auto">
            {statCells.map((cell, i) => (
              <React.Fragment key={cell.label}>
                {i > 0 && <div className="h-6 w-px bg-[var(--groups1-border)] shrink-0" />}
                <div className="flex flex-col items-center px-3 py-0.5 shrink-0">
                  <span className={`text-sm font-bold tabular-nums leading-tight ${cell.color ?? "text-[var(--groups1-text)]"}`}>
                    {isLoading ? "—" : cell.value}
                  </span>
                  <span className="text-[10px] text-[var(--groups1-text-secondary)] leading-tight mt-0.5">
                    {cell.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
