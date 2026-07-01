"use client";

import { X } from "lucide-react";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
}

export function FilterChips({ chips, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text)] border border-[var(--groups1-border)]"
        >
          {chip.label}
          <button type="button" onClick={chip.onRemove} className="ml-0.5 hover:text-red-500" aria-label={`Remove ${chip.label} filter`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-red-500 hover:text-red-600 hover:underline px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
