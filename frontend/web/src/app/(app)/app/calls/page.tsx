"use client";

import { useState, useEffect } from "react";
import { CallsStatsCards } from "@/components/calls/CallsStatsCards";
import { CallsFilterBar } from "@/components/calls/CallsFilterBar";
import { CallsTable } from "@/components/calls/CallsTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { mutate } from "swr";
import { toast } from "sonner";

const FILTER_STORAGE_KEY = "calls-page-filters";

interface SavedFilters {
  selectedCallListId: string | null;
  searchQuery: string;
}

export default function CallsPage() {
  usePageTitle("My Calls");
  
  // Load saved filters from localStorage on mount
  const loadSavedFilters = (): SavedFilters => {
    if (typeof window === "undefined") {
      return { selectedCallListId: null, searchQuery: "" };
    }
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    }
    return { selectedCallListId: null, searchQuery: "" };
  };

  const savedFilters = loadSavedFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCallListId, setSelectedCallListId] = useState<string | null>(savedFilters.selectedCallListId);
  const [searchQuery, setSearchQuery] = useState<string>(savedFilters.searchQuery);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCallListChange = (callListId: string | null) => {
    setSelectedCallListId(callListId);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearFilters = () => {
    setSelectedCallListId(null);
    setSearchQuery("");
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
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
      toast.success("Filters saved");
    } catch (error) {
      console.error("Failed to save filters:", error);
      toast.error("Failed to save filters");
    }
  };

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    // Refresh all related SWR caches
    await mutate("my-calls-stats");
    await mutate((key) => typeof key === "string" && key.startsWith("my-calls"));
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
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
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
            Manage and track your assigned calls
          </p>
        </div>
        <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
      </div>

      {/* Summary Cards */}
      <CallsStatsCards />

      {/* Filter Bar */}
      {showFilters && (
        <CallsFilterBar
          selectedCallListId={selectedCallListId}
          searchQuery={searchQuery}
          onCallListChange={handleCallListChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onSaveFilter={handleSaveFilter}
        />
      )}

      {/* Calls Table */}
      <CallsTable
        callListId={selectedCallListId}
        searchQuery={searchQuery}
        onItemsUpdated={handleItemsUpdated}
      />
    </div>
  );
}
