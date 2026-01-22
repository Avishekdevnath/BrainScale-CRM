import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-60 dark:disabled:opacity-50 dark:disabled:bg-[var(--groups1-secondary)] dark:disabled:text-[var(--groups1-text-secondary)] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[hsl(var(--ring))] focus-visible:ring-[hsl(var(--ring))]/50 focus-visible:ring-[3px] dark:focus-visible:ring-[var(--groups1-primary)] dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[var(--groups1-background)] aria-invalid:ring-[hsl(var(--danger))/0.2] dark:aria-invalid:ring-[hsl(var(--danger))/0.4] aria-invalid:border-[hsl(var(--danger))]",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))] hover:brightness-95 hover:border-black dark:hover:border-white",
        destructive:
          "bg-[hsl(var(--danger))] text-white hover:bg-[hsl(var(--danger))] hover:brightness-95 focus-visible:ring-[hsl(var(--danger))/0.2] dark:focus-visible:ring-[hsl(var(--danger))/0.4] dark:bg-[hsl(var(--danger))/0.6] hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white aria-pressed:hover:text-[inherit] aria-current:hover:text-[inherit] aria-selected:hover:text-[inherit] data-[state=active]:hover:text-[inherit] data-[state=on]:hover:text-[inherit]",
        outline:
          "border bg-[hsl(var(--background))] shadow-xs hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] dark:bg-[hsl(var(--muted))/0.2] dark:border-[var(--groups1-btn-outline-border)] dark:hover:bg-[var(--groups1-btn-outline-hover-bg)] hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white aria-pressed:hover:text-[inherit] aria-current:hover:text-[inherit] aria-selected:hover:text-[inherit] data-[state=active]:hover:text-[inherit] data-[state=on]:hover:text-[inherit]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))] hover:brightness-95 hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white aria-pressed:hover:text-[inherit] aria-current:hover:text-[inherit] aria-selected:hover:text-[inherit] data-[state=active]:hover:text-[inherit] data-[state=on]:hover:text-[inherit]",
        ghost:
          "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] dark:hover:bg-[var(--groups1-btn-ghost-hover-bg)] hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white aria-pressed:hover:text-[inherit] aria-current:hover:text-[inherit] aria-selected:hover:text-[inherit] data-[state=active]:hover:text-[inherit] data-[state=on]:hover:text-[inherit]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };


