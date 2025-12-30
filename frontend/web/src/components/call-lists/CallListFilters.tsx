"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterType = "all" | "success" | "skipped" | "follow_up";
export type AssignmentFilterType = "all" | "assigned" | "unassigned";

export interface CallListFiltersProps {
  activeFilter: FilterType;
  assignmentFilter: AssignmentFilterType;
  onFilterChange: (filter: FilterType) => void;
  onAssignmentFilterChange: (filter: AssignmentFilterType) => void;
  onClearFilters: () => void;
}

export function CallListFilters({
  activeFilter,
  assignmentFilter,
  onFilterChange,
  onAssignmentFilterChange,
  onClearFilters,
}: CallListFiltersProps) {
  const hasActiveFilters = activeFilter !== "all" || assignmentFilter !== "all";
  const activeFilterCount = [
    activeFilter !== "all" ? 1 : 0,
    assignmentFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
          Status:
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange("all")}
          className={cn(
            "h-7 px-3 text-xs",
            activeFilter === "all"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange("success")}
          className={cn(
            "h-7 px-3 text-xs",
            activeFilter === "success"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Success
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange("skipped")}
          className={cn(
            "h-7 px-3 text-xs",
            activeFilter === "skipped"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Skipped
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange("follow_up")}
          className={cn(
            "h-7 px-3 text-xs",
            activeFilter === "follow_up"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Follow Up
        </Button>
      </div>

      {/* Assignment Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
          Assignment:
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssignmentFilterChange("all")}
          className={cn(
            "h-7 px-3 text-xs",
            assignmentFilter === "all"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssignmentFilterChange("assigned")}
          className={cn(
            "h-7 px-3 text-xs",
            assignmentFilter === "assigned"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Assigned
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssignmentFilterChange("unassigned")}
          className={cn(
            "h-7 px-3 text-xs",
            assignmentFilter === "unassigned"
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)] dark:font-semibold dark:shadow-[0_0_0_1px_rgba(50,184,198,0.3)] dark:ring-1 dark:ring-[var(--groups1-primary)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Unassigned
        </Button>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-3 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
          >
            Clear Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Button>
        </div>
      )}
    </div>
  );
}

