import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        ref={ref}
        className={cn(
          "file:text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] selection:bg-[hsl(var(--primary))] selection:text-[hsl(var(--primary-foreground))] bg-[color-mix(in_oklab,var(--card) 70%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted) 30%,transparent)] border border-[hsl(var(--border))] h-10 w-full min-w-0 rounded-md backdrop-blur-sm px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:border-[hsl(var(--ring))] focus-visible:ring-[hsl(var(--ring))]/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-[hsl(var(--danger))/0.2] dark:aria-invalid:ring-[hsl(var(--danger))/0.4] aria-invalid:border-[hsl(var(--danger))]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

