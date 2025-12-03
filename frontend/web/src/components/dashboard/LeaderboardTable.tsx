"use client";

import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  rank: number;
  assignee: string;
  conversions: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  className?: string;
}

export function LeaderboardTable({
  entries,
  className,
}: LeaderboardTableProps) {
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) {
      return "bg-[var(--color-bg-2)] text-[var(--groups1-warning)]";
    }
    if (rank === 2) {
      return "bg-[var(--color-bg-1)] text-[var(--groups1-info)]";
    }
    if (rank === 3) {
      return "bg-[var(--color-bg-6)] text-[var(--groups1-warning)]";
    }
    return "bg-[var(--groups1-secondary)] text-[var(--groups1-text)]";
  };

  return (
    <table className={cn("w-full border-collapse", className)}>
      <thead>
        <tr>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide border-b border-[var(--groups1-card-border-inner)]">
            Rank
          </th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide border-b border-[var(--groups1-card-border-inner)]">
            Assignee
          </th>
          <th className="px-3 py-3 text-left text-[11px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide border-b border-[var(--groups1-card-border-inner)]">
            Conversions
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.rank}>
            <td className="px-3 py-3 border-b border-[var(--groups1-card-border-inner)]">
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                  getRankBadgeClass(entry.rank)
                )}
              >
                {entry.rank}
              </span>
            </td>
            <td className="px-3 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
              {entry.assignee}
            </td>
            <td className="px-3 py-3 text-sm font-semibold text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
              {entry.conversions}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

