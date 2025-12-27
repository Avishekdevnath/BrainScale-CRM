"use client";

import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface FilterToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function FilterToggleButton({ isOpen, onToggle, className }: FilterToggleButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onToggle}
      className={`flex items-center gap-2 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] ${className || ""}`}
    >
      <Filter className="w-4 h-4" />
      {isOpen ? (
        <>
          <span className="hidden sm:inline">Hide Filters</span>
          <ChevronUp className="w-4 h-4" />
        </>
      ) : (
        <>
          <span className="hidden sm:inline">Show Filters</span>
          <ChevronDown className="w-4 h-4" />
        </>
      )}
    </Button>
  );
}

