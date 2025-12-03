"use client";

import { useState } from "react";
import { CallsStatsCards } from "@/components/calls/CallsStatsCards";
import { CallsFilterBar } from "@/components/calls/CallsFilterBar";
import { CallsTable } from "@/components/calls/CallsTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";

export default function CallsPage() {
  usePageTitle("My Calls");
  
  const [selectedCallListId, setSelectedCallListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
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
  };

  const handleSaveFilter = () => {
    // TODO: Implement save filter functionality (could use localStorage or API)
    console.log("Save filter:", { selectedCallListId, searchQuery });
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
      </div>

      {/* Summary Cards */}
      <CallsStatsCards />

      {/* Filter Bar */}
      <CallsFilterBar
        selectedCallListId={selectedCallListId}
        searchQuery={searchQuery}
        onCallListChange={handleCallListChange}
        onSearchChange={handleSearchChange}
        onClearFilters={handleClearFilters}
        onSaveFilter={handleSaveFilter}
      />

      {/* Calls Table */}
      <CallsTable
        callListId={selectedCallListId}
        searchQuery={searchQuery}
        onItemsUpdated={handleItemsUpdated}
      />
    </div>
  );
}
