import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border font-medium transition-colors",
  {
    variants: {
      variant: {
        success:
          "bg-[rgba(var(--groups1-success-rgb),var(--groups1-status-bg-opacity))] text-[var(--groups1-success)] border-[rgba(var(--groups1-success-rgb),var(--groups1-status-border-opacity))]",
        error:
          "bg-[rgba(var(--groups1-error-rgb),var(--groups1-status-bg-opacity))] text-[var(--groups1-error)] border-[rgba(var(--groups1-error-rgb),var(--groups1-status-border-opacity))]",
        warning:
          "bg-[rgba(var(--groups1-warning-rgb),var(--groups1-status-bg-opacity))] text-[var(--groups1-warning)] border-[rgba(var(--groups1-warning-rgb),var(--groups1-status-border-opacity))]",
        info: "bg-[rgba(var(--groups1-info-rgb),var(--groups1-status-bg-opacity))] text-[var(--groups1-info)] border-[rgba(var(--groups1-info-rgb),var(--groups1-status-border-opacity))]",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        default: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "info",
      size: "default",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };

