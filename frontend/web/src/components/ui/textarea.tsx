import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "placeholder:text-[hsl(var(--muted-foreground))] selection:bg-[hsl(var(--primary))] selection:text-[hsl(var(--primary-foreground))]",
        "bg-[color-mix(in_oklab,var(--card) 70%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted) 30%,transparent)]",
        "border border-[hsl(var(--border))] w-full min-w-0 rounded-md backdrop-blur-sm px-3 py-2 text-sm shadow-xs",
        "transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:border-[hsl(var(--ring))] focus-visible:ring-[hsl(var(--ring))]/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-[hsl(var(--danger))/0.2] dark:aria-invalid:ring-[hsl(var(--danger))/0.4] aria-invalid:border-[hsl(var(--danger))]",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

