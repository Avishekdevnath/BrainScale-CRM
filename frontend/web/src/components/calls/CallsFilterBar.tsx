"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallLists } from "@/hooks/useCallLists";
import { Search, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CallsFilterBarProps {
  selectedCallListId: string | null;
  searchQuery: string;
  onCallListChange: (callListId: string | null) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  onSaveFilter?: () => void;
}

export function CallsFilterBar({
  selectedCallListId,
  searchQuery,
  onCallListChange,
  onSearchChange,
  onClearFilters,
  onSaveFilter,
}: CallsFilterBarProps) {
  const { data: callListsData, isLoading: callListsLoading } = useCallLists();

  const callLists = callListsData?.callLists || [];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
      {/* Call List Dropdown */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
          Call List
        </label>
        <select
          value={selectedCallListId || ""}
          onChange={(e) => onCallListChange(e.target.value || null)}
          disabled={callListsLoading}
          className={cn(
            "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
            callListsLoading && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Select call list"
        >
          <option value="">All Call Lists</option>
          {callLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
          <Input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]",
              "text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
              "focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            )}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-end gap-2">
        {onSaveFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveFilter}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Save Filter
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filter
        </Button>
      </div>
    </div>
  );
}

