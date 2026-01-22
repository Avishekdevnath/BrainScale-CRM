"use client";

import { useState, useEffect } from "react";
import { CallsFilterBar } from "@/components/calls/CallsFilterBar";
import { CallsTable } from "@/components/calls/CallsTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { mutate } from "swr";
import { toast } from "sonner";
import type { CallListItemState } from "@/types/call-lists.types";
import { useMyCallsStats } from "@/hooks/useMyCalls";
import { cn } from "@/lib/utils";

const FILTER_STORAGE_KEY = "calls-page-filters";

interface SavedFilters {
  selectedCallListId: string | null;
  searchQuery: string;
  state?: CallListItemState | null;
}

export default function CallsPage() {
  usePageTitle("All Calls");

  const { data: myCallsStats } = useMyCallsStats();
  
  // Load saved filters from localStorage on mount
  const loadSavedFilters = (): SavedFilters => {
    if (typeof window === "undefined") {
      return { selectedCallListId: null, searchQuery: "", state: null };
    }
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    }
    return { selectedCallListId: null, searchQuery: "", state: null };
  };

  const savedFilters = loadSavedFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCallListId, setSelectedCallListId] = useState<string | null>(savedFilters.selectedCallListId);
  const [searchQuery, setSearchQuery] = useState<string>(savedFilters.searchQuery);
  const [selectedState, setSelectedState] = useState<CallListItemState | null>(savedFilters.state ?? null);
  const [showFollowUps, setShowFollowUps] = useState(false);

  const handleCallListChange = (callListId: string | null) => {
    setSelectedCallListId(callListId);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStateChange = (state: "QUEUED" | "DONE" | null) => {
    setSelectedState(state);
    setShowFollowUps(false); // Clear follow-ups filter when state changes
  };

  const handleFollowUpsChange = (show: boolean) => {
    setShowFollowUps(show);
    if (show) {
      setSelectedState(null); // Clear state filter when showing follow-ups
    }
  };

  const handleClearFilters = () => {
    setSelectedCallListId(null);
    setSearchQuery("");
    setSelectedState(null); // Show all calls
    setShowFollowUps(false); // Clear follow-ups filter
    // Clear saved filters
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(FILTER_STORAGE_KEY);
        toast.success("Filters cleared");
      } catch (error) {
        console.error("Failed to clear saved filters:", error);
      }
    }
  };

  const handleSaveFilter = () => {
    if (typeof window === "undefined") return;
    
    try {
      const filters: SavedFilters = {
        selectedCallListId,
        searchQuery,
        state: selectedState,
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
      toast.success("Filters saved");
    } catch (error) {
      console.error("Failed to save filters:", error);
      toast.error("Failed to save filters");
    }
  };

  const handleRefresh = async () => {
    // Refresh all related SWR caches
    await mutate("my-calls-stats");
    await mutate((key) => typeof key === "string" && (key.startsWith("my-calls") || key.startsWith("all-calls")));
    await mutate((key) => typeof key === "string" && key.startsWith("call-lists"));
  };

  const handleItemsUpdated = async () => {
    await handleRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">All Calls</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
            View and manage all calls in your workspace
          </p>
        </div>
      </div>

      {/* Tabs + Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleStateChange("QUEUED")}
          className={cn(
            "justify-start",
            selectedState === "QUEUED" && !showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Pending
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {myCallsStats?.pending ?? 0}
          </span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleStateChange("DONE")}
          className={cn(
            "justify-start",
            selectedState === "DONE" && !showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Completed
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {myCallsStats?.completed ?? 0}
          </span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleFollowUpsChange(!showFollowUps)}
          className={cn(
            "justify-start",
            showFollowUps
              ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
              : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          )}
        >
          Follow-ups
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-current dark:bg-white/10">
            {myCallsStats?.followUps ?? 0}
          </span>
        </Button>
        </div>
        <div className="flex items-center justify-end">
          <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters((prev) => !prev)} />
        </div>
      </div>

      {/* Filter Bar */}
      <CollapsibleFilters open={showFilters} contentClassName="pt-6">
        <CallsFilterBar
          selectedCallListId={selectedCallListId}
          searchQuery={searchQuery}
          onCallListChange={handleCallListChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onSaveFilter={handleSaveFilter}
        />
      </CollapsibleFilters>

      {/* Calls Table */}
      <CallsTable
        callListId={selectedCallListId}
        searchQuery={searchQuery}
        state={selectedState}
        followUpRequired={showFollowUps}
        onItemsUpdated={handleItemsUpdated}
      />
    </div>
  );
}
