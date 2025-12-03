"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { cn } from "@/lib/utils";
import type { DashboardFilters } from "@/types/dashboard.types";

export interface FilterStripProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  groups?: Array<{ id: string; name: string }>;
  batches?: Array<{ id: string; name: string }>;
  statusFilters?: string[];
  selectedStatuses?: string[];
  onStatusToggle?: (status: string) => void;
  onExport?: () => void;
}

export function FilterStrip({
  filters,
  onFiltersChange,
  groups = [],
  batches = [],
  statusFilters = ["NEW", "IN_PROGRESS", "FOLLOW_UP", "CONVERTED", "LOST"],
  selectedStatuses = [],
  onStatusToggle,
  onExport,
}: FilterStripProps) {
  // Format date range for display
  const dateRangeDisplay = filters.dateFrom && filters.dateTo
    ? `${filters.dateFrom} to ${filters.dateTo}`
    : filters.dateFrom
    ? `${filters.dateFrom} to ...`
    : "Select date range";

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateFrom: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      dateTo: e.target.value || undefined,
    });
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      groupId: e.target.value || undefined,
    });
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      batchId: e.target.value || undefined,
    });
  };

  return (
    <div className="flex items-end gap-4 mb-6 flex-wrap">
      {/* Date Range */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
          Date From
        </label>
        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={handleDateFromChange}
          className={cn(
            "min-w-[150px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
          Date To
        </label>
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={handleDateToChange}
          className={cn(
            "min-w-[150px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
          )}
        />
      </div>

      {/* Groups Select */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
          Group
        </label>
        <select
          value={filters.groupId || ""}
          onChange={handleGroupChange}
          className={cn(
            "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
            "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
          )}
          aria-label="Select group"
        >
          <option value="">All Groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Batch Select */}
      {batches.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
            Batch
          </label>
          <select
            value={filters.batchId || ""}
            onChange={handleBatchChange}
            className={cn(
              "min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
              "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
              "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            )}
            aria-label="Select batch"
          >
            <option value="">All Batches</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Filter Chips */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((status) => {
            const displayStatus = status.replace("_", " ");
            return (
              <FilterChip
                key={status}
                active={selectedStatuses.includes(status)}
                onClick={() => onStatusToggle?.(status)}
              >
                {displayStatus}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {/* Export Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onExport}
        className="ml-auto bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
    </div>
  );
}

