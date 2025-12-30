"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallListStatsCard } from "./CallListStatsCard";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallListItem } from "@/types/call-lists.types";

interface CollapsibleStatsCardProps {
  items: CallListItem[];
  isLoading?: boolean;
}

export function CollapsibleStatsCard({ items, isLoading = false }: CollapsibleStatsCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const stats = React.useMemo(() => {
    const total = items.length;
    const byState = {
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

  return (
    <Card variant="groups1">
      <CardHeader variant="groups1" className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Total:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Queued:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.byState.QUEUED}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Done:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.byState.DONE}</span>
            </div>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] dark:hover:bg-[var(--groups1-secondary)]"
          >
            {isExpanded ? (
              <>
                <span className="text-xs mr-1">Less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="text-xs mr-1">More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          variant="groups1"
          className={cn(
            "py-2 border-t border-[var(--groups1-border)] transition-all duration-200",
            isExpanded ? "opacity-100 max-h-[200px]" : "opacity-0 max-h-0 overflow-hidden"
          )}
        >
          <div className="flex items-center gap-3 flex-wrap pt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Assigned:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.assigned}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Calling:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.byState.CALLING}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Skipped:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.byState.SKIPPED}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--groups1-text-secondary)]">Unassigned:</span>
              <span className="text-xs font-semibold text-[var(--groups1-text)]">{stats.unassigned}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

