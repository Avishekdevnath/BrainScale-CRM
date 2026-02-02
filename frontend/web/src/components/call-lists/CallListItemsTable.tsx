"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { CallExecutionModal } from "./CallExecutionModal";
import { CallListItemDetailsModal } from "./CallListItemDetailsModal";
import { CallListFilters } from "./CallListFilters";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { useCallListItems } from "@/hooks/useCallLists";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, Eye, UserPlus, ChevronLeft, ChevronRight, Trash2, MoreVertical } from "lucide-react";
import { mutate as globalMutate } from "swr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CallListItem, CallListItemState, CallListItemsListParams } from "@/types/call-lists.types";

export interface CallListItemsTableProps {
  listId: string;
  onItemsUpdated?: () => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onSelectionMetaChange?: (meta: {
    assignedToMe: number;
    unassigned: number;
    assignedToOthers: number;
  }) => void;
  isAdmin?: boolean;
  clearSelectionKey?: number;
}

type FilterType = "all" | "success" | "skipped" | "follow_up";

export function CallListItemsTable({
  listId,
  onItemsUpdated,
  onSelectionChange,
  onSelectionMetaChange,
  isAdmin = false,
  clearSelectionKey,
}: CallListItemsTableProps) {
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = React.useState<CallListItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = React.useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = React.useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<{ itemId: string; studentName?: string } | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [assignmentFilter, setAssignmentFilter] = React.useState<"all" | "assigned" | "unassigned">("all");
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [isAssigningToMe, setIsAssigningToMe] = React.useState(false);
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null);

  // Get current user's member ID to check if they're assigned
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember } = useCurrentMember(workspaceId);

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

  // Clear selection when parent requests it
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [clearSelectionKey]);

  // Remove assigned items from selection when data changes
  React.useEffect(() => {
    if (!data?.items) return;
    if (isAdmin) return;
    
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
  }, [data?.items, isAdmin]);

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

  // Get items for current page (filter for follow_up and assignment if needed)
  const currentPageItems = React.useMemo(() => {
    if (!data?.items) return [];

    let filtered = data.items;

    // Apply follow-up filter
    if (activeFilter === "follow_up") {
      filtered = filtered.filter((item) => {
        if (!item.callLogId) return false;
        const callLog = callLogsMap.get(item.callLogId);
        return callLog?.followUpRequired === true;
      });
    }

    // Apply assignment filter
    if (assignmentFilter === "assigned") {
      filtered = filtered.filter((item) => item.assignedTo !== null);
    } else if (assignmentFilter === "unassigned") {
      filtered = filtered.filter((item) => item.assignedTo === null);
    }

    return filtered;
  }, [data?.items, activeFilter, assignmentFilter, callLogsMap]);

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
      // Apply assignment filter to follow-up items
      let filtered = allFollowUpItems;
      if (assignmentFilter === "assigned") {
        filtered = filtered.filter((item) => item.assignedTo !== null);
      } else if (assignmentFilter === "unassigned") {
        filtered = filtered.filter((item) => item.assignedTo === null);
      }
      const start = (filters.page! - 1) * pageSize;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
    return currentPageItems;
  }, [activeFilter, currentPageItems, allFollowUpItems, assignmentFilter, filters.page, pageSize]);

  const totalItems = React.useMemo(() => {
    if (activeFilter === "follow_up") {
      // Apply assignment filter to follow-up items
      let filtered = allFollowUpItems;
      if (assignmentFilter === "assigned") {
        filtered = filtered.filter((item) => item.assignedTo !== null);
      } else if (assignmentFilter === "unassigned") {
        filtered = filtered.filter((item) => item.assignedTo === null);
      }
      return filtered.length;
    }
    // For other filters, we need to apply assignment filter to the total
    // Since assignment filter is client-side, we'll use currentPageItems length as approximation
    // or we could fetch all items, but that's expensive. For now, use pagination total
    // and let the client-side filtering handle it
    const baseTotal = data?.pagination?.total || 0;
    // Note: This is an approximation. For accurate counts with assignment filter,
    // we'd need to fetch all items or add server-side filtering
    return baseTotal;
  }, [activeFilter, allFollowUpItems, assignmentFilter, data?.pagination?.total]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const selectionMeta = React.useMemo(() => {
    let assignedToMe = 0;
    let unassigned = 0;
    let assignedToOthers = 0;

    for (const item of paginatedItems) {
      if (!selectedItemIds.has(item.id)) continue;
      if (!item.assignedTo) {
        unassigned += 1;
      } else if (currentMember?.id && item.assignedTo === currentMember.id) {
        assignedToMe += 1;
      } else {
        assignedToOthers += 1;
      }
    }

    return { assignedToMe, unassigned, assignedToOthers };
  }, [currentMember?.id, paginatedItems, selectedItemIds]);

  const onSelectionMetaChangeRef = React.useRef(onSelectionMetaChange);
  onSelectionMetaChangeRef.current = onSelectionMetaChange;

  React.useEffect(() => {
    onSelectionMetaChangeRef.current?.(selectionMeta);
  }, [selectionMeta]);

  const handleSelectAll = React.useCallback(() => {
    if (!paginatedItems) return;
    const selectableItemIds = isAdmin
      ? paginatedItems.map((item) => item.id)
      : paginatedItems
          .filter((item) => !item.assignedTo || (currentMember?.id && item.assignedTo === currentMember.id))
          .map((item) => item.id);
    
    if (selectableItemIds.length === 0) {
      toast.info(isAdmin ? "No items on this page" : "No unassigned items on this page");
      return;
    }

    const allSelected = selectableItemIds.every((id) => selectedItemIds.has(id));
    
    if (allSelected) {
      // Deselect all selectable items on current page
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        selectableItemIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all selectable items on current page
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        selectableItemIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [paginatedItems, selectedItemIds, isAdmin, currentMember?.id]);

  const handleSelectItem = React.useCallback((itemId: string, assignedTo: string | null) => {
    if (assignedTo && !isAdmin && assignedTo !== currentMember?.id) {
      toast.info("This item is assigned to another member.");
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
  }, [currentMember?.id, isAdmin]);

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
    // Invalidate dashboard cache to refresh stats
    globalMutate(
      (key: any) => typeof key === "string" && key.startsWith("dashboard/"),
      undefined,
      { revalidate: true }
    );
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

  const handleDeleteItem = React.useCallback(
    (itemId: string, studentName?: string) => {
      setRemoveTarget({ itemId, studentName });
      setIsRemoveDialogOpen(true);
    },
    []
  );

  const handleConfirmRemove = React.useCallback(async () => {
    if (!removeTarget) return;

    setDeletingItemId(removeTarget.itemId);
    try {
      await apiClient.deleteCallListItem(removeTarget.itemId);
      toast.success("Student removed from call list");
      setIsRemoveDialogOpen(false);
      setRemoveTarget(null);
      await mutate();
      onItemsUpdated?.();
      // Remove from selection if selected
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(removeTarget.itemId);
        return next;
      });
    } catch (error: any) {
      console.error("Failed to delete item:", error);
      toast.error(error?.message || "Failed to remove student from call list");
    } finally {
      setDeletingItemId(null);
    }
  }, [mutate, onItemsUpdated, removeTarget]);

  const getCallLogData = (item: CallListItem) => {
    if (!item.callLogId) return null;
    return callLogsMap.get(item.callLogId) || null;
  };

  const isAllSelectedOnCurrentPage = React.useMemo(() => {
    if (!paginatedItems || paginatedItems.length === 0) return false;
    const selectableItems = isAdmin
      ? paginatedItems
      : paginatedItems.filter((item) => !item.assignedTo || (currentMember?.id && item.assignedTo === currentMember.id));
    if (selectableItems.length === 0) return false;
    return selectableItems.every((item) => selectedItemIds.has(item.id));
  }, [paginatedItems, selectedItemIds, isAdmin, currentMember?.id]);

  return (
    <>
      <Card variant="groups1">
        <CardHeader variant="groups1" className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              Students ({totalItems})
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Pagination Size Selector */}
              <div className="flex items-center gap-1.5">
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
        <CardContent variant="groups1" className="pb-3 pt-2">
          {/* Filters */}
          <div className="flex items-center justify-between mb-3">
            <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
          </div>
          <CollapsibleFilters open={showFilters}>
            <CallListFilters
              activeFilter={activeFilter}
              assignmentFilter={assignmentFilter}
              onFilterChange={(filter) => {
                setActiveFilter(filter);
              }}
              onAssignmentFilterChange={(filter) => {
                setAssignmentFilter(filter);
              }}
              onClearFilters={() => {
                setActiveFilter("all");
                setAssignmentFilter("all");
              }}
            />
          </CollapsibleFilters>

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
            <div className="space-y-3">
              {/* Mobile card view */}
              <div className="md:hidden flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                  <input
                    type="checkbox"
                    checked={isAllSelectedOnCurrentPage}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer"
                  />
                  Select page
                </label>
                <div className="text-xs text-[var(--groups1-text-secondary)]">
                  {selectedItemIds.size} selected
                </div>
              </div>

              <div className="md:hidden space-y-2">
                {paginatedItems.map((item, index) => {
                  const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                  const isUpdating = updatingItemId === item.id;
                  const callLog = getCallLogData(item);
                  const summaryNote = callLog?.summaryNote || null;
                  const followUpDate = callLog?.followUpDate || null;
                  const serialNumber = (filters.page! - 1) * pageSize + index + 1;

                  const isAssigned = !!item.assignedTo;
                  const isAssignedToMe = !!item.assignedTo && !!currentMember?.id && item.assignedTo === currentMember.id;
                  const isAssignedToOther = isAssigned && !isAssignedToMe;
                  const isSelected = selectedItemIds.has(item.id);
                  const canStartCall =
                    item.state !== "DONE" && !!item.assignedTo && currentMember?.id === item.assignedTo;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3",
                        isAssignedToOther && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(item.id, item.assignedTo)}
                            className="mt-1 w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isUpdating || (isAssignedToOther && !isAdmin)}
                            title={isAssignedToOther && !isAdmin ? "This item is assigned to another member" : ""}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                #{serialNumber}
                              </span>
                              <StatusBadge variant={getStateVariant(item.state)} size="sm">
                                {getStateLabel(item.state)}
                              </StatusBadge>
                            </div>

                            <div className="mt-1 min-w-0">
                              {item.student ? (
                                <Link
                                  href={`/app/students/${item.student.id}`}
                                  className="font-semibold text-[var(--groups1-text)] hover:underline block truncate"
                                >
                                  {item.student.name}
                                </Link>
                              ) : (
                                <span className="text-sm text-[var(--groups1-text-secondary)]">Student not found</span>
                              )}
                              {primaryPhone ? (
                                <a
                                  href={`tel:${primaryPhone.phone}`}
                                  className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span className="truncate">{primaryPhone.phone}</span>
                                </a>
                              ) : (
                                <div className="mt-0.5 text-sm text-[var(--groups1-text-secondary)]">-</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {canStartCall && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartCall(item)}
                              disabled={isUpdating || deletingItemId === item.id}
                              className="h-8 px-2 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}

                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={isUpdating || deletingItemId === item.id}
                                aria-label="Item actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                sideOffset={4}
                                className="min-w-[180px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg z-50"
                              >
                                {!item.assignedTo && (
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      handleAssignItem(item.id, null);
                                    }}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    Assign to Me
                                  </DropdownMenu.Item>
                                )}
                                {item.state !== "DONE" &&
                                  item.assignedTo &&
                                  currentMember?.id === item.assignedTo && (
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        handleStartCall(item);
                                      }}
                                    >
                                      <Phone className="h-4 w-4" />
                                      Start Call
                                    </DropdownMenu.Item>
                                  )}
                                <DropdownMenu.Item
                                  className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleViewDetails(item);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenu.Item>
                                {isAdmin && (
                                  <>
                                    <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-red-600 dark:text-red-300 outline-none hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-50 dark:focus:bg-red-900/30"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        handleDeleteItem(item.id, item.student?.name);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove from List
                                    </DropdownMenu.Item>
                                  </>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-2 py-1.5">
                          <div className="text-[var(--groups1-text-secondary)]">Assigned</div>
                          <div className="mt-0.5 text-[var(--groups1-text)] break-all">
                            {item.assignedTo ? item.assignee?.user?.email || "Assigned" : "Unassigned"}
                          </div>
                        </div>
                        <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-2 py-1.5">
                          <div className="text-[var(--groups1-text-secondary)]">Follow-up</div>
                          <div className="mt-0.5 text-[var(--groups1-text)]">
                            {followUpDate ? new Date(followUpDate).toLocaleDateString() : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs text-[var(--groups1-text-secondary)]">Summary Note (AI)</div>
                        {summaryNote ? (
                          <p className="mt-0.5 text-sm text-[var(--groups1-text-secondary)] line-clamp-2" title={summaryNote}>
                            {summaryNote}
                          </p>
                        ) : (
                          <div className="mt-0.5 text-sm text-[var(--groups1-text-secondary)]">-</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelectedOnCurrentPage}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] w-12">
                      SL
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Assigned
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Summary Note (AI)
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Follow-up Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
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
                  const isAssignedToMe = !!item.assignedTo && !!currentMember?.id && item.assignedTo === currentMember.id;
                  const isAssignedToOther = isAssigned && !isAssignedToMe;
                  const isSelected = selectedItemIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isAssignedToOther
                          ? "opacity-60 bg-[var(--groups1-background)]"
                          : "hover:bg-[var(--groups1-secondary)]"
                      }`}
                        onMouseEnter={() => setHoveredRowId(item.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectItem(item.id, item.assignedTo)}
                            className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isUpdating || (isAssignedToOther && !isAdmin)}
                            title={isAssignedToOther && !isAdmin ? "This item is assigned to another member" : ""}
                          />
                        </td>
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] text-sm text-[var(--groups1-text-secondary)]">
                          {serialNumber}
                        </td>
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
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
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
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
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
                          {item.assignedTo ? (
                            <span className="text-sm text-[var(--groups1-text)]">
                              <span
                                className="block max-w-[220px] truncate"
                                title={item.assignee?.user?.email || "Assigned"}
                              >
                                {item.assignee?.user?.email || "Assigned"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
                          <StatusBadge
                            variant={getStateVariant(item.state)}
                            size="sm"
                          >
                            {getStateLabel(item.state)}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] max-w-xs">
                          {summaryNote ? (
                            <p className="text-sm text-[var(--groups1-text-secondary)] truncate" title={summaryNote}>
                              {summaryNote}
                            </p>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
                          {followUpDate ? (
                            <span className="text-sm text-[var(--groups1-text)]">
                              {new Date(followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        <td 
                          className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] text-right w-20"
                        >
                          <div className={cn(
                            "flex items-center justify-end gap-2 transition-opacity duration-200",
                            (hoveredRowId === item.id || isSelected) ? "opacity-100" : "opacity-0"
                          )}>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-7 w-7 p-0",
                                    hoveredRowId !== item.id && !isSelected && "pointer-events-none"
                                  )}
                                  disabled={isUpdating || deletingItemId === item.id}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  sideOffset={4}
                                  className="min-w-[180px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg z-50"
                                >
                                  {!item.assignedTo && (
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        handleAssignItem(item.id, null);
                                      }}
                                    >
                                      <UserPlus className="h-4 w-4" />
                                      Assign to Me
                                    </DropdownMenu.Item>
                                  )}
                                  {item.state !== "DONE" && item.assignedTo && currentMember?.id === item.assignedTo && (
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        handleStartCall(item);
                                      }}
                                    >
                                      <Phone className="h-4 w-4" />
                                      Start Call
                                    </DropdownMenu.Item>
                                  )}
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      handleViewDetails(item);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </DropdownMenu.Item>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
                                      <DropdownMenu.Item
                                        className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-red-600 dark:text-red-300 outline-none hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-50 dark:focus:bg-red-900/30"
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          handleDeleteItem(item.id, item.student?.name);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove from List
                                      </DropdownMenu.Item>
                                    </>
                                  )}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-2 pt-2 border-t border-[var(--groups1-border)] gap-2">
              <div className="text-xs md:text-sm text-[var(--groups1-text-secondary)]">
                Showing {paginatedItems.length > 0 ? (filters.page! - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(filters.page! * pageSize, totalItems)} of {totalItems}
              </div>
              <div className="flex items-center gap-2 justify-between md:justify-start">
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
                <div className="text-xs md:text-sm text-[var(--groups1-text-secondary)]">
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

      <Dialog
        open={isRemoveDialogOpen}
        onOpenChange={(open) => {
          setIsRemoveDialogOpen(open);
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogClose onClose={() => setIsRemoveDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to remove {removeTarget?.studentName || "this student"} from the call list? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={!!deletingItemId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={!!deletingItemId || !removeTarget}
            >
              {!!deletingItemId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
