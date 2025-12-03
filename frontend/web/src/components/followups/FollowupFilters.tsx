"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallLists } from "@/hooks/useCallLists";
import { MemberSelector } from "@/components/call-lists/MemberSelector";
import { X } from "lucide-react";
import type { ListFollowupsParams } from "@/types/followups.types";

export interface FollowupFiltersProps {
  filters: ListFollowupsParams;
  onFiltersChange: (filters: ListFollowupsParams) => void;
  onClear: () => void;
}

export function FollowupFilters({
  filters,
  onFiltersChange,
  onClear,
}: FollowupFiltersProps) {
  const { data: callListsData } = useCallLists();
  const callLists = callListsData?.callLists || [];

  const hasActiveFilters =
    filters.callListId ||
    filters.status ||
    filters.assignedTo ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="space-y-4 p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Call List Filter */}
        <div>
          <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1 block">
            Call List
          </Label>
          <select
            value={filters.callListId || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                callListId: e.target.value || undefined,
                page: 1, // Reset to page 1 when filter changes
              })
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
          >
            <option value="">All Call Lists</option>
            {callLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1 block">
            Status
          </Label>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                status: (e.target.value || undefined) as "PENDING" | "DONE" | "SKIPPED" | undefined,
                page: 1,
              })
            }
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DONE">Done</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1 block">
            Assignee
          </Label>
          <MemberSelector
            selectedMemberId={filters.assignedTo || null}
            onSelectMemberId={(memberId) =>
              onFiltersChange({
                ...filters,
                assignedTo: memberId || undefined,
                page: 1,
              })
            }
            placeholder="All Assignees"
          />
        </div>

        {/* Start Date Filter */}
        <div>
          <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1 block">
            Start Date
          </Label>
          <Input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                startDate: e.target.value || undefined,
                page: 1,
              })
            }
            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <Label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1 block">
            End Date
          </Label>
          <Input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                endDate: e.target.value || undefined,
                page: 1,
              })
            }
            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
          />
        </div>
      </div>
    </div>
  );
}

