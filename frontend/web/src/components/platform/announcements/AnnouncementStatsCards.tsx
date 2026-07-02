"use client";

import { Megaphone, Users, Clock, Building2 } from "lucide-react";
import type { Announcement } from "@/types/notifications.types";

interface AnnouncementStatsCardsProps {
  items: Announcement[];
  total: number;
  isLoading: boolean;
}

const CARD =
  "rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 flex items-center gap-3";

export function AnnouncementStatsCards({ items, total, isLoading }: AnnouncementStatsCardsProps) {
  const latest = items[0];
  const recipientsReached = items.reduce((sum, a) => sum + a.recipientCount, 0);

  const cards = [
    {
      label: "Total announcements",
      value: isLoading ? "…" : String(total),
      icon: Megaphone,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: "Recipients reached (recent)",
      value: isLoading ? "…" : String(recipientsReached),
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Last sent",
      value: isLoading ? "…" : latest ? new Date(latest.createdAt).toLocaleDateString() : "Never",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Last target",
      value: isLoading
        ? "…"
        : latest
          ? latest.targetType === "ALL"
            ? "All workspaces"
            : `${latest.workspaceIds.length} workspace${latest.workspaceIds.length === 1 ? "" : "s"}`
          : "—",
      icon: Building2,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={CARD}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg}`}>
            <c.icon className={`w-4.5 h-4.5 ${c.color}`} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-[var(--groups1-text)] truncate">{c.value}</p>
            <p className="text-xs text-[var(--groups1-text-secondary)] truncate">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
