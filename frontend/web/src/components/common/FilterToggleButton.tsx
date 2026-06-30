"use client";

import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface FilterToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  activeCount?: number;
  className?: string;
}

export function FilterToggleButton({ isOpen, onToggle, activeCount, className }: FilterToggleButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onToggle}
      className={`flex items-center gap-1.5 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] ${className || ""}`}
    >
      <Filter className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Filters</span>
      {activeCount != null && activeCount > 0 && (
        <span className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
          {activeCount}
        </span>
      )}
      {isOpen ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )}
    </Button>
  );
}

