"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  /** Force open on >= md viewports regardless of state. */
  alwaysOpenOnDesktop?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  alwaysOpenOnDesktop = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={cn("border border-[var(--groups1-border)] rounded-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-3 text-left",
          "bg-[var(--groups1-secondary)] hover:bg-[var(--groups1-surface)]",
          alwaysOpenOnDesktop && "md:cursor-default md:hover:bg-[var(--groups1-secondary)]"
        )}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--groups1-text)]">{title}</div>
          {summary && !open && (
            <div className="text-xs text-[var(--groups1-text-secondary)] mt-0.5 truncate">{summary}</div>
          )}
        </div>
        <span className={cn("flex-shrink-0 text-[var(--groups1-text-secondary)]", alwaysOpenOnDesktop && "md:hidden")}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <div
        className={cn(
          "px-3 py-3 md:px-4 md:py-4 space-y-3 bg-[var(--groups1-background)]",
          !open && "hidden",
          alwaysOpenOnDesktop && "md:block"
        )}
      >
        {children}
      </div>
    </div>
  );
}
