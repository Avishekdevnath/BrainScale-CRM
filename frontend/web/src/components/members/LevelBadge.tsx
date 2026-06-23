"use client";

import { cn } from "@/lib/utils";

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  OWNER: { label: "Owner", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ADMIN: { label: "Admin", className: "bg-blue-100 text-blue-700 border-blue-200" },
  MEMBER: { label: "Member", className: "bg-green-100 text-green-700 border-green-200" },
  CUSTOM: {
    label: "Custom",
    className:
      "bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border-[var(--groups1-border)]",
  },
};

export function LevelBadge({ level, className }: { level: string; className?: string }) {
  const badge = LEVEL_BADGE[level] ?? LEVEL_BADGE.CUSTOM;
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border font-medium",
        badge.className,
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
