import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, active = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={active}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)] focus-visible:ring-offset-2",
          active
            ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)]"
            : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
FilterChip.displayName = "FilterChip";

export { FilterChip };

