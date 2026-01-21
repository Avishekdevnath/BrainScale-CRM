"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useMyCalls, useMyCallsStats } from "@/hooks/useMyCalls";
import { useGroups } from "@/hooks/useGroups";
import { useCallLists } from "@/hooks/useCallLists";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { CallExecutionModal } from "@/components/call-lists/CallExecutionModal";
import { getStateLabel, getStateColor, formatCallDuration } from "@/lib/call-list-utils";
import { mutate } from "swr";
import { Phone, Loader2, Search, X, ChevronLeft, ChevronRight, MoreVertical, Pencil, Eye, UserX } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EditCallLogDialog } from "@/components/call-lists/EditCallLogDialog";
import { CallLogDetailsModal } from "@/components/call-lists/CallLogDetailsModal";
import { useCallLog } from "@/hooks/useCallLogs";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { CallListItem, CallListItemState, CallLog } from "@/types/call-lists.types";

function MyCallsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId") || null);
  const [callListId, setCallListId] = useState<string | null>(searchParams.get("callListId") || null);
  const [state, setState] = useState<CallListItemState | null>(() => {
    // Don't initialize state if follow-ups filter is active
    if (searchParams.get("followUps") === "true") return null;
    const stateParam = searchParams.get("state");
    if (!stateParam) return "QUEUED"; // Default to pending calls
    const validStates: CallListItemState[] = ["QUEUED", "CALLING", "DONE", "SKIPPED"];
    return validStates.includes(stateParam as CallListItemState) ? (stateParam as CallListItemState) : "QUEUED";
  });
  const [showFollowUps, setShowFollowUps] = useState(() => {
    return searchParams.get("followUps") === "true";
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedItem, setSelectedItem] = useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewingLogId, setViewingLogId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassigningItemId, setUnassigningItemId] = useState<string | null>(null);

  usePageTitle("My Calls");

  const { data: callsData, error, isLoading, mutate: mutateCalls } = useMyCalls({
    page,
    size: 20,
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    callListId: callListId || undefined,
    state: showFollowUps ? undefined : (state || "QUEUED"), // Don't filter by state if showing follow-ups
    followUpRequired: showFollowUps ? true : undefined, // Filter by follow-ups when active
  });

  const { data: stats, mutate: mutateStats } = useMyCallsStats();
  const { data: groups } = useGroups();
  const { data: callListsData } = useCallLists();

  const items = callsData?.items || [];
  const pagination = callsData?.pagination || { page: 1, size: 20, total: 0, totalPages: 0 };

  // Filter items by search query (follow-ups filtering is now done via API)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.student?.name.toLowerCase().includes(query) ||
        item.student?.email?.toLowerCase().includes(query) ||
        item.callList?.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (batchId) params.set("batchId", batchId);
    if (groupId) params.set("groupId", groupId);
    if (callListId) params.set("callListId", callListId);
    // Only add state to URL if follow-ups filter is not active
    if (state && !showFollowUps) params.set("state", state);
    if (showFollowUps) params.set("followUps", "true");
    if (searchQuery) params.set("q", searchQuery);
    const newUrl = params.toString() ? `/app/my-calls?${params.toString()}` : "/app/my-calls";
    router.replace(newUrl, { scroll: false });
  }, [page, batchId, groupId, callListId, state, showFollowUps, searchQuery, router]);

  const handleStartCall = (item: CallListItem) => {
    setSelectedItem(item);
    setIsExecutionModalOpen(true);
  };

  const handleExecutionSuccess = async () => {
    setIsExecutionModalOpen(false);
    setSelectedItem(null);
    await mutateCalls();
    await mutateStats();
    // Invalidate dashboard cache to refresh stats
    await mutate(
      (key) => typeof key === "string" && key.startsWith("dashboard/"),
      undefined,
      { revalidate: true }
    );
    toast.success("Call completed successfully");
  };

  const handleEditCall = (callLogId: string) => {
    setEditingLogId(callLogId);
    setIsEditDialogOpen(true);
  };

  const handleViewCall = (callLogId: string) => {
    setViewingLogId(callLogId);
    setIsViewDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await mutateCalls();
    await mutateStats();
    setEditingLogId(null);
    // Invalidate dashboard cache to refresh stats
    await mutate(
      (key) => typeof key === "string" && key.startsWith("dashboard/"),
      undefined,
      { revalidate: true }
    );
  };

  // Fetch call log for editing
  const { data: editingLog } = useCallLog(editingLogId);
  
  // Fetch call log for viewing
  const { data: viewingLog } = useCallLog(viewingLogId);

  const clearFilters = () => {
    setBatchId(null);
    setGroupId(null);
    setCallListId(null);
    setState(null);
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = batchId || groupId || callListId || state || searchQuery;

  const handleUnassignItem = async (item: CallListItem) => {
    if (!item.callListId) {
      toast.error("Call list ID is missing");
      return;
    }
    setUnassigningItemId(item.id);
    try {
      await apiClient.unassignCallListItems(item.callListId, {
        itemIds: [item.id],
      });
      toast.success("Item unassigned successfully");
      await mutateCalls();
      await mutateStats();
    } catch (error: any) {
      console.error("Failed to unassign item:", error);
      toast.error(error?.message || "Failed to unassign item");
    } finally {
      setUnassigningItemId(null);
    }
  };

  const handleBulkUnassign = async () => {
    if (selectedItemIds.size === 0) {
      toast.info("Please select items to unassign");
      return;
    }

    // Group items by callListId
    const itemsByListId = new Map<string, string[]>();
    filteredItems.forEach((item) => {
      if (selectedItemIds.has(item.id) && item.callListId) {
        const listId = item.callListId;
        if (!itemsByListId.has(listId)) {
          itemsByListId.set(listId, []);
        }
        itemsByListId.get(listId)!.push(item.id);
      }
    });

    if (itemsByListId.size === 0) {
      toast.error("No valid items selected");
      return;
    }

    setIsUnassigning(true);
    try {
      // Unassign from each call list
      const promises = Array.from(itemsByListId.entries()).map(([listId, itemIds]) =>
        apiClient.unassignCallListItems(listId, { itemIds })
      );
      await Promise.all(promises);
      toast.success(`${selectedItemIds.size} item(s) unassigned successfully`);
      setSelectedItemIds(new Set());
      await mutateCalls();
      await mutateStats();
    } catch (error: any) {
      console.error("Failed to unassign items:", error);
      toast.error(error?.message || "Failed to unassign items");
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const isAllSelected = filteredItems.length > 0 && selectedItemIds.size === filteredItems.length;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load calls"}
            </p>
            <Button
              onClick={() => mutateCalls()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
        <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="space-y-4">
          {/* Bottom Section - Filter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              label="Pending"
              value={stats.pending}
              onClick={() => {
                setShowFollowUps(false);
                // Toggle: if already showing QUEUED, keep it (it's the default), otherwise show QUEUED
                setState("QUEUED");
                setPage(1);
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                state === "QUEUED" && !showFollowUps && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
              )}
            />
            <KPICard
              label="Completed"
              value={stats.completed}
              onClick={() => {
                setShowFollowUps(false);
                // Toggle: if already showing DONE, reset to QUEUED (default), otherwise show DONE
                setState(state === "DONE" ? "QUEUED" : "DONE");
                setPage(1);
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                state === "DONE" && !showFollowUps && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
              )}
            />
            <KPICard
              label="Follow-ups"
              value={stats.followUps || 0}
              onClick={() => {
                // Toggle follow-ups filter
                if (showFollowUps) {
                  // If already showing follow-ups, reset to QUEUED (default)
                  setShowFollowUps(false);
                  setState("QUEUED");
                } else {
                  // Show follow-ups
                  setShowFollowUps(true);
                  setState(null); // Clear state filter when showing follow-ups
                }
                setPage(1);
              }}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                showFollowUps && "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]"
              )}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <CollapsibleFilters open={showFilters} contentClassName="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or call list..."
                className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              />
            </div>

            <BatchFilter
              value={batchId}
              onChange={(value) => {
                setBatchId(value);
                setPage(1);
              }}
              placeholder="All Batches"
            />

            <select
              value={groupId || ""}
              onChange={(e) => {
                setGroupId(e.target.value || null);
                setPage(1);
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Groups</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={callListId || ""}
              onChange={(e) => {
                setCallListId(e.target.value || null);
                setPage(1);
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Call Lists</option>
              {callListsData?.callLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            <select
              value={state || ""}
              onChange={(e) => {
                const value = e.target.value;
                const validStates: CallListItemState[] = ["QUEUED", "CALLING", "DONE", "SKIPPED"];
                setState(value && validStates.includes(value as CallListItemState) ? (value as CallListItemState) : null);
                setPage(1);
              }}
              className="min-w-[180px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Statuses</option>
              <option value="QUEUED">Pending</option>
              <option value="CALLING">In Progress</option>
              <option value="DONE">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
      </CollapsibleFilters>

      {/* Calls Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>Assigned Calls</CardTitle>
            {selectedItemIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnassign}
                disabled={isUnassigning}
                className="bg-orange-500 text-white hover:bg-orange-600 border-0"
              >
                {isUnassigning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4 mr-2" />
                )}
                Unassign ({selectedItemIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {hasActiveFilters
                ? "No calls found matching your filters"
                : "No calls assigned to you"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--groups1-border)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)] w-12">
                         <input
                           type="checkbox"
                           checked={isAllSelected}
                           onChange={handleSelectAll}
                           className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer"
                         />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Call List
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Group
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                      const isSelected = selectedItemIds.has(item.id);
                      const isUnassigningThis = unassigningItemId === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] ${
                            isSelected ? "bg-[var(--groups1-secondary)]" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectItem(item.id)}
                              className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isUnassigningThis}
                            />
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.student?.id ? (
                              <button
                                onClick={() => router.push(`/app/students/${item.student!.id}`)}
                                className="text-blue-600 hover:underline hover:text-blue-800 font-medium cursor-pointer"
                              >
                                {item.student.name || "Unknown"}
                              </button>
                            ) : (
                              <span>{item.student?.name || "Unknown"}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {primaryPhone ? (
                              <a
                                href={`tel:${primaryPhone.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {primaryPhone.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.callList?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.callList?.group?.name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <StatusBadge
                                variant={getStateColor(item.state) === "green" ? "success" : getStateColor(item.state) === "yellow" ? "warning" : getStateColor(item.state) === "blue" ? "info" : "info"}
                              >
                                {getStateLabel(item.state)}
                              </StatusBadge>
                              {/* Only show follow-up badge if latest call log explicitly requires follow-up */}
                              {item.callLog?.followUpRequired === true && (
                                <StatusBadge
                                  variant="info"
                                  className="bg-teal-100 text-teal-800 border-teal-300"
                                >
                                  Follow-up
                                  {item.callLog.followUpDate && new Date(item.callLog.followUpDate) < new Date() && (
                                    <span className="ml-1 text-orange-600">(Overdue)</span>
                                  )}
                                </StatusBadge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Hide unassign button for follow-ups */}
                              {!showFollowUps && item.callLog?.followUpRequired !== true && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnassignItem(item)}
                                  disabled={isUnassigningThis || isUnassigning}
                                  className="bg-orange-500 text-white hover:bg-orange-600 border-0"
                                  title="Unassign this call"
                                >
                                  {isUnassigningThis ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <UserX className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              {/* Show "Call" button for follow-ups */}
                              {item.callLog?.followUpRequired === true && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartCall(item)}
                                  disabled={isUnassigningThis || isUnassigning}
                                  className="bg-teal-600 text-white hover:bg-teal-700 border-0"
                                  title="Make follow-up call"
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  Call
                                </Button>
                              )}
                              {/* Show dropdown menu for completed calls (always show Edit/View for DONE items) */}
                              {item.state === "DONE" && item.callLogId && (
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      aria-label="Call log actions"
                                      disabled={isUnassigningThis || isUnassigning}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                      className="z-50 min-w-[160px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg"
                                      align="end"
                                    >
                                      <DropdownMenu.Item
                                        className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)]"
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          handleEditCall(item.callLogId!);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit Call
                                      </DropdownMenu.Item>
                                      <DropdownMenu.Item
                                        className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)]"
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          handleViewCall(item.callLogId!);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                        View Call
                                      </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                              )}
                              {/* Show "Start Call" button for pending calls */}
                              {item.state !== "DONE" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartCall(item)}
                                  disabled={isUnassigningThis || isUnassigning}
                                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  Start Call
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Showing {((pagination.page - 1) * pagination.size) + 1} to{" "}
                    {Math.min(pagination.page * pagination.size, pagination.total)} of{" "}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-[var(--groups1-text)]">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Execution Modal */}
      <CallExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={setIsExecutionModalOpen}
        callListItem={selectedItem}
        previousCallLog={
          selectedItem?.callLog?.followUpRequired === true && selectedItem?.callLog
            ? selectedItem.callLog
            : null
        }
        onSuccess={handleExecutionSuccess}
      />

      {/* Edit Call Log Dialog */}
      <EditCallLogDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingLogId(null);
          }
        }}
        callLog={editingLog || null}
        onSuccess={handleEditSuccess}
      />

      {/* View Call Log Modal */}
      <CallLogDetailsModal
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setViewingLogId(null);
          }
        }}
        callLog={viewingLog || null}
      />
    </div>
  );
}

export default function MyCallsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
          </CardContent>
        </Card>
      </div>
    }>
      <MyCallsPageContent />
    </Suspense>
  );
}

