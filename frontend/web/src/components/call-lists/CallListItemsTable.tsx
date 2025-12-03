"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallExecutionModal } from "./CallExecutionModal";
import { CallListItemDetailsModal } from "./CallListItemDetailsModal";
import { useCallListItems } from "@/hooks/useCallLists";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, Eye, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { mutate } from "swr";
import Link from "next/link";
import type { CallListItem, CallListItemState, CallListItemsListParams } from "@/types/call-lists.types";

export interface CallListItemsTableProps {
  listId: string;
  onItemsUpdated?: () => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  isAdmin?: boolean;
}

type FilterType = "all" | "success" | "skipped" | "follow_up";

export function CallListItemsTable({ listId, onItemsUpdated, onSelectionChange, isAdmin = false }: CallListItemsTableProps) {
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = React.useState<CallListItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = React.useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = React.useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [isAssigningToMe, setIsAssigningToMe] = React.useState(false);

  // Notify parent of selection changes
  React.useEffect(() => {
    onSelectionChange?.(Array.from(selectedItemIds));
  }, [selectedItemIds, onSelectionChange]);

  const [filters, setFilters] = React.useState<CallListItemsListParams>({
    page: 1,
    size: 25,
  });
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null);

  // Update filters when page size or filter changes
  React.useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1, // Reset to page 1 when filter or page size changes
      size: pageSize,
      state: activeFilter === "all" ? undefined : activeFilter === "success" ? "DONE" : activeFilter === "skipped" ? "SKIPPED" : undefined,
    }));
  }, [pageSize, activeFilter]);

  const { data, isLoading, error, mutate } = useCallListItems(listId, filters);

  // Clear selection when page changes
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [filters.page, filters.size]);

  // Remove assigned items from selection when data changes
  React.useEffect(() => {
    if (!data?.items) return;
    
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      let removed = false;
      
      data.items.forEach((item) => {
        if (next.has(item.id) && item.assignedTo) {
          next.delete(item.id);
          removed = true;
        }
      });
      
      if (removed && next.size !== prev.size) {
        // Some items were removed, show a message
        const removedCount = prev.size - next.size;
        if (removedCount > 0) {
          toast.info(`${removedCount} selected item(s) are already assigned and were removed from selection.`);
        }
      }
      
      return next;
    });
  }, [data?.items]);

  // Fetch call logs for follow-up filter
  const [callLogsMap, setCallLogsMap] = React.useState<Map<string, any>>(new Map());
  
  React.useEffect(() => {
    if (!data?.items || activeFilter !== "follow_up") return;

    const fetchCallLogs = async () => {
      const itemsWithCallLogs = data.items.filter((item) => item.callLogId && !callLogsMap.has(item.callLogId));
      if (itemsWithCallLogs.length === 0) return;

      const promises = itemsWithCallLogs.map(async (item) => {
        if (!item.callLogId) return null;
        try {
          const callLog = await apiClient.getCallLog(item.callLogId);
          return { itemId: item.id, callLogId: item.callLogId, callLog };
        } catch (error) {
          console.error(`Failed to fetch call log ${item.callLogId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const newMap = new Map(callLogsMap);
      results.forEach((result) => {
        if (result) {
          newMap.set(result.callLogId, result.callLog);
        }
      });
      setCallLogsMap(newMap);
    };

    fetchCallLogs();
  }, [data?.items, activeFilter]);

  // Get items for current page (filter for follow_up if needed)
  const currentPageItems = React.useMemo(() => {
    if (!data?.items) return [];

    if (activeFilter === "follow_up") {
      return data.items.filter((item) => {
        if (!item.callLogId) return false;
        const callLog = callLogsMap.get(item.callLogId);
        return callLog?.followUpRequired === true;
      });
    }

    return data.items;
  }, [data?.items, activeFilter, callLogsMap]);

  // Get all items for follow-up filter (needed for pagination count)
  const [allFollowUpItems, setAllFollowUpItems] = React.useState<CallListItem[]>([]);
  
  React.useEffect(() => {
    if (activeFilter !== "follow_up") {
      setAllFollowUpItems([]);
      return;
    }

    // Fetch all items for follow-up filter
    const fetchAllForFollowUp = async () => {
      try {
        const response = await apiClient.getCallListItems(listId, { page: 1, size: 1000 });
        const itemsWithCallLogs = response.items.filter((item) => item.callLogId);
        
        const promises = itemsWithCallLogs.map(async (item) => {
          if (!item.callLogId) return null;
          try {
            const callLog = await apiClient.getCallLog(item.callLogId);
            return { item, callLog };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(promises);
        const followUpItems = results
          .filter((r) => r && r.callLog?.followUpRequired === true)
          .map((r) => r!.item);

        setAllFollowUpItems(followUpItems);
      } catch (error) {
        console.error("Failed to fetch all follow-up items:", error);
      }
    };

    fetchAllForFollowUp();
  }, [activeFilter, listId]);

  // Calculate pagination for follow-up filter
  const paginatedItems = React.useMemo(() => {
    if (activeFilter === "follow_up") {
      const start = (filters.page! - 1) * pageSize;
      const end = start + pageSize;
      return allFollowUpItems.slice(start, end);
    }
    return currentPageItems;
  }, [activeFilter, currentPageItems, allFollowUpItems, filters.page, pageSize]);

  const totalItems = React.useMemo(() => {
    if (activeFilter === "follow_up") {
      return allFollowUpItems.length;
    }
    return data?.pagination?.total || 0;
  }, [activeFilter, allFollowUpItems.length, data?.pagination?.total]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const handleSelectAll = React.useCallback(() => {
    if (!paginatedItems) return;
    // Only select unassigned items
    const unassignedItemIds = paginatedItems
      .filter((item) => !item.assignedTo)
      .map((item) => item.id);
    
    if (unassignedItemIds.length === 0) {
      toast.info("No unassigned items on this page");
      return;
    }

    const allUnassignedSelected = unassignedItemIds.every((id) => selectedItemIds.has(id));
    
    if (allUnassignedSelected) {
      // Deselect all unassigned items on current page
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        unassignedItemIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all unassigned items on current page
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        unassignedItemIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [paginatedItems, selectedItemIds]);

  const handleSelectItem = React.useCallback((itemId: string, isAssigned: boolean) => {
    if (isAssigned) {
      toast.info("This item is already assigned. Please unassign it first.");
      return;
    }
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleAssignItem = React.useCallback(
    async (itemId: string, memberId: string | null) => {
      setUpdatingItemId(itemId);
      try {
        await apiClient.assignCallListItems(listId, {
          itemIds: [itemId],
          assignedTo: memberId || undefined,
        });
        toast.success(memberId ? "Item assigned" : "Item unassigned");
        await mutate();
        onItemsUpdated?.();
      } catch (error: any) {
        console.error("Failed to assign item:", error);
        toast.error(error?.message || "Failed to assign item");
        await mutate();
      } finally {
        setUpdatingItemId(null);
      }
    },
    [listId, mutate, onItemsUpdated]
  );

  const handleAssignToMe = React.useCallback(async () => {
    const selectedArray = Array.from(selectedItemIds);
    if (selectedArray.length === 0) {
      toast.info("Please select items to assign");
      return;
    }

    // Filter to only include unassigned items
    const unassignedItems = paginatedItems.filter(
      (item) => selectedArray.includes(item.id) && !item.assignedTo
    );

    if (unassignedItems.length === 0) {
      toast.error("Selected items are already assigned. Please select unassigned items.");
      return;
    }

    const unassignedIds = unassignedItems.map((item) => item.id);
    const alreadyAssignedCount = selectedArray.length - unassignedIds.length;

    setIsAssigningToMe(true);
    try {
      await apiClient.assignCallListItems(listId, {
        itemIds: unassignedIds,
        // assignedTo is undefined, which means assign to current user
      });
      if (alreadyAssignedCount > 0) {
        toast.success(
          `${unassignedIds.length} items assigned to you. ${alreadyAssignedCount} item(s) were already assigned and skipped.`
        );
      } else {
        toast.success(`${unassignedIds.length} items assigned to you`);
      }
      setSelectedItemIds(new Set());
      await mutate();
      onItemsUpdated?.();
    } catch (error: any) {
      console.error("Failed to assign items:", error);
      toast.error(error?.message || "Failed to assign items");
    } finally {
      setIsAssigningToMe(false);
    }
  }, [selectedItemIds, listId, mutate, onItemsUpdated, paginatedItems]);

  const getStateVariant = (state: CallListItemState): "success" | "warning" | "info" | "error" => {
    const color = getStateColor(state);
    switch (color) {
      case "green":
        return "success";
      case "blue":
        return "info";
      case "red":
        return "error";
      case "yellow":
      case "gray":
      default:
        return "warning";
    }
  };

  const handleStartCall = (item: CallListItem) => {
    setSelectedItem(item);
    setIsExecutionModalOpen(true);
  };

  const handleViewDetails = (item: CallListItem) => {
    setSelectedItemForDetails(item);
    setIsDetailsModalOpen(true);
  };

  const handleExecutionSuccess = async () => {
    setIsExecutionModalOpen(false);
    setSelectedItem(null);
    await mutate();
    onItemsUpdated?.();
    setCallLogsMap(new Map());
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedItemForDetails(null);
  };

  const handleDetailsUpdated = async () => {
    await mutate();
    onItemsUpdated?.();
    setCallLogsMap(new Map());
  };

  const getCallLogData = (item: CallListItem) => {
    if (!item.callLogId) return null;
    return callLogsMap.get(item.callLogId) || null;
  };

  const isAllSelectedOnCurrentPage = React.useMemo(() => {
    if (!paginatedItems || paginatedItems.length === 0) return false;
    const unassignedItems = paginatedItems.filter((item) => !item.assignedTo);
    if (unassignedItems.length === 0) return false;
    return unassignedItems.every((item) => selectedItemIds.has(item.id));
  }, [paginatedItems, selectedItemIds]);

  return (
    <>
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>
              Students ({totalItems})
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Pagination Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--groups1-text-secondary)]">Per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setFilters((prev) => ({ ...prev, size: newSize, page: 1 }));
                  }}
                  className="px-2 py-1 text-sm rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {/* Filter Toggle Buttons */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--groups1-border)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === "all"
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                    : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("success")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === "success"
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                    : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setActiveFilter("skipped")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === "skipped"
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                    : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Skipped
              </button>
              <button
                onClick={() => setActiveFilter("follow_up")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === "follow_up"
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                    : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Follow Up
              </button>
            </div>

            {/* Assign to Me Button */}
            {(() => {
              const selectedArray = Array.from(selectedItemIds);
              const unassignedSelectedCount = paginatedItems.filter(
                (item) => selectedArray.includes(item.id) && !item.assignedTo
              ).length;
              
              if (selectedItemIds.size === 0) return null;
              
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAssignToMe}
                  disabled={isAssigningToMe || unassignedSelectedCount === 0}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    unassignedSelectedCount === 0
                      ? "Selected items are already assigned. Please select unassigned items."
                      : ""
                  }
                >
                  {isAssigningToMe ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Assign to Me ({unassignedSelectedCount > 0 ? unassignedSelectedCount : selectedItemIds.size})
                </Button>
              );
            })()}
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading items...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load items"}
              </p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelectedOnCurrentPage}
                        onChange={handleSelectAll}
                        className="rounded border-[var(--groups1-border)]"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] w-12">
                      SL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Assigned
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Summary Note (AI)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Follow-up Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, index) => {
                    const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                    const isUpdating = updatingItemId === item.id;
                    const callLog = getCallLogData(item);
                    const summaryNote = callLog?.summaryNote || null;
                    const followUpDate = callLog?.followUpDate || null;
                    const serialNumber = (filters.page! - 1) * pageSize + index + 1;

                    const isAssigned = !!item.assignedTo;
                    const isSelected = selectedItemIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isAssigned
                            ? "opacity-60 bg-[var(--groups1-background)]"
                            : "hover:bg-[var(--groups1-secondary)]"
                        }`}
                      >
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(item.id, isAssigned)}
                            className="rounded border-[var(--groups1-border)]"
                            disabled={isUpdating || isAssigned}
                            title={isAssigned ? "This item is already assigned" : ""}
                          />
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)] text-sm text-[var(--groups1-text-secondary)]">
                          {serialNumber}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          {item.student ? (
                            <Link
                              href={`/app/students/${item.student.id}`}
                              className="hover:underline"
                            >
                              <div className="font-medium text-[var(--groups1-text)]">
                                {item.student.name}
                              </div>
                            </Link>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">
                              Student not found
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          {primaryPhone ? (
                            <a
                              href={`tel:${primaryPhone.phone}`}
                              className="text-sm text-[var(--groups1-text)] hover:underline"
                            >
                              {primaryPhone.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          {item.assignedTo ? (
                            <span className="text-sm text-[var(--groups1-text)]">
                              {item.assignee?.user?.name || "Assigned"}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          <StatusBadge
                            variant={getStateVariant(item.state)}
                            size="sm"
                          >
                            {getStateLabel(item.state)}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)] max-w-xs">
                          {summaryNote ? (
                            <p className="text-sm text-[var(--groups1-text-secondary)] truncate" title={summaryNote}>
                              {summaryNote}
                            </p>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                          {followUpDate ? (
                            <span className="text-sm text-[var(--groups1-text)]">
                              {new Date(followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)] text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.state !== "DONE" && item.assignedTo && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartCall(item)}
                                disabled={isUpdating}
                                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(item)}
                              disabled={isUpdating}
                              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                Showing {paginatedItems.length > 0 ? (filters.page! - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(filters.page! * pageSize, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))}
                  disabled={filters.page === 1 || isLoading}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-[var(--groups1-text-secondary)]">
                  Page {filters.page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))}
                  disabled={filters.page === totalPages || isLoading}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CallExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={setIsExecutionModalOpen}
        callListItem={selectedItem}
        onSuccess={handleExecutionSuccess}
      />

      <CallListItemDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        callListItem={selectedItemForDetails}
        listId={listId}
        onUpdated={handleDetailsUpdated}
      />
    </>
  );
}
