"use client";

import { useBatches } from "@/hooks/useBatches";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface BatchSelectorProps {
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  isActiveOnly?: boolean;
  className?: string;
}

export function BatchSelector({
  value,
  onChange,
  multiple = false,
  placeholder = "Select batch",
  allowClear = true,
  isActiveOnly = true,
  className,
}: BatchSelectorProps) {
  const { data, isLoading, error } = useBatches({
    isActive: isActiveOnly ? true : undefined,
  });

  const batches = data?.batches || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions);
      const selectedValues = selectedOptions.map((option) => option.value);
      onChange(selectedValues.length > 0 ? selectedValues : null);
    } else {
      const selectedValue = e.target.value || null;
      onChange(selectedValue);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
          "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
          "flex items-center gap-2",
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading batches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-red-300",
          "bg-[var(--groups1-surface)] text-red-600",
          className
        )}
      >
        Error loading batches
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <select
        disabled
        className={cn(
          "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
          "bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)]",
          "opacity-50 cursor-not-allowed",
          "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8",
          className
        )}
      >
        <option value="">No batches available</option>
      </select>
    );
  }

  const currentValue = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (typeof value === "string" ? value : value?.[0] || "");

  return (
    <select
      multiple={multiple}
      value={multiple ? currentValue : currentValue}
      onChange={handleChange}
      className={cn(
        "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
        "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8",
        multiple && "min-h-[80px]",
        className
      )}
      aria-label={placeholder}
    >
      {allowClear && !multiple && <option value="">{placeholder}</option>}
      {batches.map((batch) => (
        <option key={batch.id} value={batch.id}>
          {batch.name}
        </option>
      ))}
    </select>
  );
}

