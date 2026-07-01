"use client";

import { cn } from "@/lib/utils";

export interface StatusTab {
  id: string;
  label: string;
  count?: number;
}

export interface StatusTabBarProps {
  tabs: StatusTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function StatusTabBar({ tabs, activeId, onChange }: StatusTabBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl w-fit">
      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              active
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-sm"
                : "text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  "text-[11px] font-bold tabular-nums",
                  active
                    ? "text-[var(--groups1-btn-primary-text)] opacity-80"
                    : "text-[var(--groups1-text-secondary)]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
