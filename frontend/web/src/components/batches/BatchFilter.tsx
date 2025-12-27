"use client";

import { useBatches } from "@/hooks/useBatches";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface BatchFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function BatchFilter({
  value,
  onChange,
  placeholder = "All Batches",
  className,
}: BatchFilterProps) {
  const { data, isLoading, error } = useBatches({ isActive: true });

  const batches = data?.batches || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value || null);
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
          "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
          "flex items-center gap-2",
          className
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "w-full px-3 py-1.5 text-sm rounded-lg border border-red-300",
          "bg-[var(--groups1-surface)] text-red-600",
          className
        )}
      >
        Error loading batches
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={handleChange}
      className={cn(
        "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
        "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8",
        className
      )}
      aria-label="Filter by batch"
    >
      <option value="">{placeholder}</option>
      {batches.map((batch) => (
        <option key={batch.id} value={batch.id}>
          {batch.name}
          {batch._count?.studentBatches !== undefined &&
            ` (${batch._count.studentBatches})`}
        </option>
      ))}
    </select>
  );
}

