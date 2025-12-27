import * as React from "react";
import { cn } from "@/lib/utils";

export interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    type: "positive" | "negative" | "neutral";
  };
  breakdown?: string; // Optional breakdown text to display below the value
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ className, label, value, trend, breakdown, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm",
          className
        )}
        {...props}
      >
        <div className="text-xs text-[var(--groups1-text-secondary)] mb-2 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-bold text-[var(--groups1-text)] mb-1">
          {value}
        </div>
        {breakdown && (
          <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">
            {breakdown}
          </div>
        )}
        {trend && !breakdown && (
          <div
            className={cn(
              "text-xs font-medium",
              trend.type === "positive" && "text-[var(--groups1-success)]",
              trend.type === "negative" && "text-[var(--groups1-error)]",
              trend.type === "neutral" && "text-[var(--groups1-text-secondary)]"
            )}
          >
            {trend.value}
          </div>
        )}
      </div>
    );
  }
);
KPICard.displayName = "KPICard";

export { KPICard };

