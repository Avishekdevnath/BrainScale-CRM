"use client";

import * as React from "react";
import { useMyCallsStats } from "@/hooks/useMyCalls";
import { useMyCalls } from "@/hooks/useMyCalls";
import { KPICard } from "@/components/ui/kpi-card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallsStatsCardsProps {
  selectedState?: "QUEUED" | "DONE" | null;
  onStateChange?: (state: "QUEUED" | "DONE" | null) => void;
  showFollowUps?: boolean;
  onFollowUpsChange?: (showFollowUps: boolean) => void;
}

export function CallsStatsCards({ selectedState, onStateChange, showFollowUps, onFollowUpsChange }: CallsStatsCardsProps) {
  const { data: stats, isLoading: statsLoading } = useMyCallsStats();

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse"
          >
            <div className="h-4 w-24 bg-[var(--groups1-secondary)] rounded mb-2" />
            <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KPICard
        label="Calls Pending"
        value={stats?.pending || 0}
        onClick={() => onStateChange?.("QUEUED")}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedState === "QUEUED" && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
        )}
      />
      <KPICard
        label="Calls Completed"
        value={stats?.completed || 0}
        onClick={() => onStateChange?.("DONE")}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedState === "DONE" && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
        )}
      />
      <KPICard
        label="Calls Requiring Follow-up"
        value={stats?.followUps || 0}
        onClick={() => onFollowUpsChange?.(!showFollowUps)}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          showFollowUps && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
        )}
      />
    </div>
  );
}

