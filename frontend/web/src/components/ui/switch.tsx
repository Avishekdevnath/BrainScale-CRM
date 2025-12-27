"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label
        className={cn(
          "relative inline-flex items-center cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <div
          className={cn(
            "w-11 h-6 bg-[var(--groups1-border)] rounded-full peer",
            "peer-checked:bg-[var(--groups1-primary)]",
            "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--groups1-focus-ring)]",
            "peer-disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5",
              "peer-checked:translate-x-5",
              "transition-transform duration-200"
            )}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };

