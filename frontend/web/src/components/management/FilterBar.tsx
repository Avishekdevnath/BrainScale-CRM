"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  activeFilterCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeFilterCount,
  open,
  onOpenChange,
  children,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl">
      <Search className="w-4 h-4 text-[var(--groups1-text-secondary)] flex-shrink-0" />
      <input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
      />

      <div className="w-px h-5 bg-[var(--groups1-border)] flex-shrink-0" />

      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border transition-colors",
            activeFilterCount > 0
              ? "border-[var(--groups1-primary)]/40 bg-[var(--groups1-primary)]/8 text-[var(--groups1-primary)] hover:bg-[var(--groups1-primary)]/15"
              : "border-dashed border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          <Plus className="w-3 h-3" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] text-[10px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
            <div className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl shadow-lg overflow-y-auto max-h-[80vh] py-2">
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
