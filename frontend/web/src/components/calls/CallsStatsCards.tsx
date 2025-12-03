"use client";

import * as React from "react";
import { Clock, CheckCircle2, Headphones } from "lucide-react";
import { useMyCallsStats } from "@/hooks/useMyCalls";
import { useMyCalls } from "@/hooks/useMyCalls";
import { cn } from "@/lib/utils";

export function CallsStatsCards() {
  const { data: stats, isLoading: statsLoading } = useMyCallsStats();
  const { data: allItemsData } = useMyCalls({ size: 1000 }); // Fetch all items to count follow-ups

  // Calculate follow-up count from items that have call logs with followUpRequired
  const followUpCount = React.useMemo(() => {
    if (!allItemsData?.items) return 0;
    // For now, we'll count items that are DONE and might need follow-up
    // In a real implementation, we'd need to check callLog.followUpRequired
    // This is a placeholder - you may need to enhance the API to return this
    return allItemsData.items.filter((item) => item.state === "DONE" && item.callLogId).length;
  }, [allItemsData?.items]);

  const cards = [
    {
      label: "Calls Pending",
      value: stats?.pending || 0,
      icon: Clock,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
    },
    {
      label: "Calls Completed",
      value: stats?.completed || 0,
      icon: CheckCircle2,
      iconColor: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      label: "Calls Requiring Follow-up",
      value: followUpCount,
      icon: Headphones,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
  ];

  if (statsLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-6 shadow-sm animate-pulse"
          >
            <div className="h-4 w-24 bg-[var(--groups1-secondary)] rounded mb-4" />
            <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md",
              "bg-[var(--groups1-surface)] border-[var(--groups1-card-border)]",
              card.bgColor,
              card.borderColor
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                {card.label}
              </div>
              <Icon className={cn("w-5 h-5", card.iconColor)} />
            </div>
            <div className="text-3xl font-bold text-[var(--groups1-text)]">
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

