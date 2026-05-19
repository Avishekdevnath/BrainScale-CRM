"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { CallListItemDetailsModal } from "./CallListItemDetailsModal";
import { CallHistoryModal } from "./CallHistoryModal";

const CallExecutionModal = dynamic(() => import("./CallExecutionModal").then(mod => ({ default: mod.CallExecutionModal })), { ssr: false });
import { CallListFilters } from "./CallListFilters";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { useCallList, useCallListItems } from "@/hooks/useCallLists";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { extractQuestions, getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, Eye, UserPlus, UserMinus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, MoreVertical, Download, Search, Users, History } from "lucide-react";
import { mutate as globalMutate } from "swr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Answer, CallListItem, CallListItemState, CallListItemsListParams, Question, CustomColumnDef } from "@/types/call-lists.types";

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
type AssignmentFilterType = "all" | "assigned" | "unassigned" | "member";


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
  const [historyItem, setHistoryItem] = React.useState<CallListItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [assignmentFilter, setAssignmentFilter] = React.useState<AssignmentFilterType>("all");
  const [memberFilterId, setMemberFilterId] = React.useState<string | null>(null);
  const [pageSize, setPageSize] = React.useState<number>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("call-list-items:pageSize") : null;
    return saved ? Number(saved) : 25;
  });
  const [isAssigningToMe, setIsAssigningToMe] = React.useState(false);
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [hideDone, setHideDone] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("call-list-items:hideDone") === "1";
  });
  const [expandedAnswerItems, setExpandedAnswerItems] = React.useState<Set<string>>(new Set());
  const [draftCount, setDraftCount] = React.useState<number>(0);
  const [isSubmittingDrafts, setIsSubmittingDrafts] = React.useState(false);

  const toggleAnswers = React.useCallback((itemId: string) => {
    setExpandedAnswerItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

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
      // Use server-side filtering so pagination is consistent (no client-side "holes")
      state:
        activeFilter === "all" || activeFilter === "follow_up"
          ? undefined
          : activeFilter === "success"
          ? "DONE"
          : activeFilter === "skipped"
          ? "SKIPPED"
          : undefined,
      followUpRequired: activeFilter === "follow_up" ? true : undefined,
      assignment: assignmentFilter === "all" || assignmentFilter === "member" ? undefined : assignmentFilter,
      assignedTo: assignmentFilter === "member" ? memberFilterId || undefined : undefined,
    }));
  }, [pageSize, activeFilter, assignmentFilter, memberFilterId]);

  const { data: callListDetails } = useCallList(listId);
  const { data, isLoading, error, mutate } = useCallListItems(listId, filters);

  // Clear selection when page changes
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [filters.page, filters.size]);

  // Clear selection when parent requests it
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [clearSelectionKey]);

  // Refresh data when tab becomes visible (mobile optimization)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mutate]);

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
  // Server already returns paginated + filtered items.
  const paginatedItems = React.useMemo(() => data?.items ?? [], [data?.items]);
  const serverTotalItems = data?.pagination?.total ?? 0;

  // Filter items by search query and "Hide done" toggle.
  const filteredItems = React.useMemo(() => {
    let items = paginatedItems;
    if (hideDone) {
      items = items.filter((item) => item.state !== "DONE");
    }
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => {
      const studentName = item.student?.name?.toLowerCase().includes(q);
      const studentPhone = item.student?.phones?.some(p => p.phone?.includes(q));
      return studentName || studentPhone;
    });
  }, [paginatedItems, searchQuery, hideDone]);

  // Pre-compute state-specific serial numbers.
  // Pending and done each get their own #1, #2, #3...
  // When state filter is active all items are same state so page offset is accurate.
  // In mixed view counters reset per page — slight inaccuracy at page boundaries only.
  const serialMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const pageOffset = (filters.page! - 1) * pageSize;
    const stateFiltered = activeFilter === "success" || activeFilter === "skipped";

    if (stateFiltered) {
      // All items same state — simple global offset
      filteredItems.forEach((item, idx) => {
        map.set(item.id, pageOffset + idx + 1);
      });
    } else {
      // Mixed: separate counter per state
      let pendingIdx = 0;
      let doneIdx = 0;
      filteredItems.forEach((item) => {
        if (item.state === "DONE") {
          doneIdx++;
          map.set(item.id, pageOffset + doneIdx);
        } else {
          pendingIdx++;
          map.set(item.id, pageOffset + pendingIdx);
        }
      });
    }
    return map;
  }, [filteredItems, filters.page, pageSize, activeFilter]);

  // When search or hideDone is active, count rendered rows; otherwise use server total
  const totalItems = searchQuery.trim() || hideDone ? filteredItems.length : serverTotalItems;
  const totalPages = Math.ceil(totalItems / pageSize);

  const questions = React.useMemo(() => {
    const fromCallListDetails = extractQuestions(callListDetails);
    if (fromCallListDetails.length > 0) {
      return fromCallListDetails.slice().sort((a, b) => a.order - b.order);
    }

    const fromItemQuestions = paginatedItems[0]?.callList?.questions;
    if (fromItemQuestions && fromItemQuestions.length > 0) {
      return fromItemQuestions.slice().sort((a, b) => a.order - b.order);
    }

    const fromItemMeta = paginatedItems[0]?.callList?.meta?.questions;
    if (Array.isArray(fromItemMeta) && fromItemMeta.length > 0) {
      return (fromItemMeta as Question[]).slice().sort((a, b) => a.order - b.order);
    }

    return [];
  }, [callListDetails, paginatedItems]);

  const customColumns = React.useMemo((): CustomColumnDef[] => {
    const fromDetails = (callListDetails?.columns ?? callListDetails?.meta?.columns) as CustomColumnDef[] | undefined;
    if (fromDetails?.length) return fromDetails;
    const fromItem = paginatedItems[0]?.callList?.columns as CustomColumnDef[] | undefined;
    return fromItem ?? [];
  }, [callListDetails, paginatedItems]);

  const selectionMeta = React.useMemo(() => {
    let assignedToMe = 0;
    let unassigned = 0;
    let assignedToOthers = 0;

    for (const item of filteredItems) {
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
  }, [currentMember?.id, filteredItems, selectedItemIds]);

  const onSelectionMetaChangeRef = React.useRef(onSelectionMetaChange);
  onSelectionMetaChangeRef.current = onSelectionMetaChange;

  React.useEffect(() => {
    onSelectionMetaChangeRef.current?.(selectionMeta);
  }, [selectionMeta]);

  const handleSelectAll = React.useCallback(() => {
    if (!filteredItems) return;
    const selectableItemIds = isAdmin
      ? filteredItems.map((item) => item.id)
      : filteredItems
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
  }, [filteredItems, selectedItemIds, isAdmin, currentMember?.id]);

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
          // When memberId is null, backend assigns to current user.
          assignedTo: memberId || undefined,
        });
        toast.success(memberId ? "Item assigned" : "Item assigned to you");
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

  const handleUnassignItem = React.useCallback(
    async (itemId: string) => {
      setUpdatingItemId(itemId);
      try {
        await apiClient.unassignCallListItems(listId, { itemIds: [itemId] });
        toast.success("Item unassigned");
        await mutate();
        onItemsUpdated?.();
      } catch (error: any) {
        console.error("Failed to unassign item:", error);
        toast.error(error?.message || "Failed to unassign item");
        await mutate();
      } finally {
        setUpdatingItemId(null);
      }
    },
    [listId, mutate, onItemsUpdated]
  );

  const refreshDraftCount = React.useCallback(async () => {
    try {
      const drafts = await apiClient.listCallDrafts({ callListId: listId });
      setDraftCount(Array.isArray(drafts) ? drafts.length : 0);
    } catch {
      setDraftCount(0);
    }
  }, [listId]);

  React.useEffect(() => {
    refreshDraftCount();
  }, [refreshDraftCount]);

  const handleSubmitAllDrafts = React.useCallback(async () => {
    if (draftCount === 0) {
      toast.info("No saved drafts to submit");
      return;
    }
    const confirmed = confirm(
      `Submit ${draftCount} saved draft(s) as completed call log(s)?`
    );
    if (!confirmed) return;

    setIsSubmittingDrafts(true);
    try {
      const result = await apiClient.submitAllCallDrafts({ callListId: listId });
      if (result.succeeded > 0) {
        toast.success(
          `Submitted ${result.succeeded} of ${result.total} draft(s)` +
            (result.failed > 0 ? ` — ${result.failed} failed` : "")
        );
      } else if (result.failed > 0) {
        toast.error(`All ${result.failed} draft(s) failed to submit`);
      }
      if (result.failures && result.failures.length > 0) {
        console.warn("Draft submission failures:", result.failures);
      }
      await mutate();
      onItemsUpdated?.();
      await refreshDraftCount();
    } catch (error: any) {
      console.error("submit-all drafts failed:", error);
      toast.error(error?.message || "Failed to submit drafts");
    } finally {
      setIsSubmittingDrafts(false);
    }
  }, [draftCount, listId, mutate, onItemsUpdated, refreshDraftCount]);

  const handleMarkAllPendingDone = React.useCallback(
    async () => {
      const pendingItems = paginatedItems.filter((item) => item.state !== "DONE");
      if (pendingItems.length === 0) {
        toast.info("No pending items to mark done");
        return;
      }

      const confirmed = confirm(`Mark ${pendingItems.length} pending item(s) as done?`);
      if (!confirmed) return;

      try {
        const result = await apiClient.bulkUpdateCallListItems(listId, {
          itemIds: pendingItems.map((item) => item.id),
          state: "DONE",
        });

        const { succeeded = 0, skipped = 0 } = result;

        if (skipped > 0) {
          toast.success(
            `Marked ${succeeded} item(s) as done. ${skipped} item(s) skipped (missing call data).`
          );
        } else {
          toast.success(`Marked ${succeeded} item(s) as done`);
        }

        await mutate();
        onItemsUpdated?.();
      } catch (error: any) {
        console.error("Failed to mark items done:", error);
        toast.error(error?.message || "Failed to mark items as done");
        await mutate();
      }
    },
    [paginatedItems, mutate, onItemsUpdated]
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
    return item.callLog || null;
  };

  const normalizeQuestionText = (value: string | undefined | null): string => {
    return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
  };

  const getAnswer = (item: CallListItem, question: Question): Answer | undefined => {
    const answers = item.callLog?.answers || [];
    const answerByQuestionId = answers.find((answer) => answer.questionId === question.id);
    if (answerByQuestionId) return answerByQuestionId;

    const targetQuestionText = normalizeQuestionText(question.question);
    if (!targetQuestionText) return undefined;

    return answers.find((answer) => normalizeQuestionText(answer.question) === targetQuestionText);
  };

  const formatAnswerValue = (answer: string | number | boolean | undefined | null): string => {
    if (answer === undefined || answer === null || answer === "") return "-";
    if (typeof answer === "boolean") return answer ? "Yes" : "No";
    if (answer === "true") return "Yes";
    if (answer === "false") return "No";
    return String(answer);
  };

  const getQuestionHeaderLabel = (question: Question): string => {
    const shortFromCamel = question.shortLabel?.trim();
    const shortFromSnake = (question as unknown as { short_label?: string }).short_label?.trim();
    const short = shortFromCamel || shortFromSnake;
    return short && short.length > 0 ? short : "-";
  };

  const getQuestionExportLabel = (question: Question): string => {
    const shortLabel = getQuestionHeaderLabel(question);
    return shortLabel !== "-" ? shortLabel : question.question;
  };

  const formatDateForExport = (value?: string | null): string => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const getPrimaryPhone = (item: CallListItem): string => {
    const primaryPhone = item.student?.phones?.find((phone) => phone.isPrimary) || item.student?.phones?.[0];
    return primaryPhone?.phone || "-";
  };

  const handleExportExcel = async () => {
    if (isExportingExcel) return;

    setIsExportingExcel(true);
    try {
      const XLSX = await import("xlsx");
      const requestParams: CallListItemsListParams = {
        ...filters,
        page: 1,
        size: 1000,
      };

      const firstPage = await apiClient.getCallListItems(listId, requestParams);
      const allItems: CallListItem[] = [...firstPage.items];
      const totalPagesForExport = firstPage.pagination.totalPages || 1;

      for (let page = 2; page <= totalPagesForExport; page += 1) {
        const pageResult = await apiClient.getCallListItems(listId, {
          ...requestParams,
          page,
        });
        allItems.push(...pageResult.items);
      }

      const questionHeaders = questions.map((question) => getQuestionExportLabel(question));
      const headers = [
        "SL",
        "Student Name",
        "Phone",
        "Assigned",
        "Status",
        ...questionHeaders,
        "Follow-up Date",
      ];

      const rows = allItems.map((item, index) => {
        const assignedTo = item.assignee?.user?.email || (item.assignedTo ? "Assigned" : "Unassigned");
        const answerValues = questions.map((question) => {
          const answer = getAnswer(item, question);
          return formatAnswerValue(answer?.answer);
        });

        return [
          index + 1,
          item.student?.name || "Student not found",
          getPrimaryPhone(item),
          assignedTo,
          getStateLabel(item.state),
          ...answerValues,
          formatDateForExport(item.callLog?.followUpDate),
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Call List Items");

      const safeListName = (callListDetails?.name || "call-list")
        .replace(/[\\/:*?"<>|]/g, "-")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

      XLSX.writeFile(workbook, `${safeListName || "call-list"}-items-${timestamp}.xlsx`);
      toast.success(`Exported ${allItems.length} item(s) to Excel.`);
    } catch (error: unknown) {
      console.error("Failed to export call list items:", error);
      const message = error instanceof Error ? error.message : "Failed to export call list items";
      toast.error(message);
    } finally {
      setIsExportingExcel(false);
    }
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || isExportingExcel || filteredItems.length === 0}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExportingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    Export Excel
                  </>
                )}
              </Button>
              {/* Pagination Size Selector */}
              <div className="flex items-center gap-1.5">
                <label className="text-sm text-[var(--groups1-text-secondary)]">Per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    localStorage.setItem("call-list-items:pageSize", String(newSize));
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
              memberFilterId={memberFilterId}
              onFilterChange={(filter) => {
                setActiveFilter(filter);
              }}
              onAssignmentFilterChange={(filter) => {
                setAssignmentFilter(filter);
                // Reset member filter when switching away from "member" filter
                if (filter !== "member") {
                  setMemberFilterId(null);
                }
              }}
              onMemberFilterChange={(memberId) => {
                setMemberFilterId(memberId);
              }}
              onClearFilters={() => {
                setActiveFilter("all");
                setAssignmentFilter("all");
                setMemberFilterId(null);
              }}
            />
          </CollapsibleFilters>

          {/* Quick Search + Hide Done toggle */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <input
                type="search"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setHideDone((v) => {
                  const next = !v;
                  if (typeof window !== "undefined") {
                    localStorage.setItem("call-list-items:hideDone", next ? "1" : "0");
                  }
                  return next;
                });
              }}
              aria-pressed={hideDone}
              title="Hide rows already marked as Done. When off, Done rows stay in place so serial numbers don't shift."
              className={cn(
                "h-9 px-3 text-xs whitespace-nowrap",
                hideDone
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)]"
                  : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              )}
            >
              {hideDone ? "Showing: Pending" : "Hide Done"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllPendingDone}
              title="Mark all pending (non-Done) items as Done"
              className="h-9 px-3 text-xs whitespace-nowrap bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Mark All Pending Done
            </Button>
            {draftCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSubmitAllDrafts}
                disabled={isSubmittingDrafts}
                title="Submit all saved drafts (with their answers/notes) as call logs"
                className="h-9 px-3 text-xs whitespace-nowrap bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                {isSubmittingDrafts ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit {draftCount} Draft{draftCount === 1 ? "" : "s"}</>
                )}
              </Button>
            )}
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
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-[var(--groups1-text-secondary)]" />
              </div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">No students found</p>
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                {searchQuery.trim()
                  ? "No students match your search"
                  : activeFilter !== "all" || assignmentFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No students have been added to this call list yet"}
              </p>
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
                {filteredItems.map((item, index) => {
                  const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                  const isUpdating = updatingItemId === item.id;
                  const callLog = getCallLogData(item);
                  const followUpDate = callLog?.followUpDate || null;
                  const serialNumber = serialMap.get(item.id) ?? index + 1;

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

                          <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                              onClick={() => {
                                setHistoryItem(item);
                                setIsHistoryModalOpen(true);
                              }}
                              title="Call History"
                              aria-label="Call History"
                            >
                              <History className="w-4 h-4" />
                            </Button>

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
                                {!!item.assignedTo && (isAdmin || (currentMember?.id && item.assignedTo === currentMember.id)) && (
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      handleUnassignItem(item.id);
                                    }}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                    Unassign
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

                      {questions.length > 0 && (
                        <>
                          {questions.length >= 3 && (
                            <button
                              type="button"
                              onClick={() => toggleAnswers(item.id)}
                              className="mt-2 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] flex items-center gap-1 transition-colors"
                            >
                              {expandedAnswerItems.has(item.id) ? (
                                <><ChevronUp className="w-3 h-3" />Hide answers</>
                              ) : (
                                <><ChevronDown className="w-3 h-3" />Show answers ({questions.length})</>
                              )}
                            </button>
                          )}
                          {(questions.length < 3 || expandedAnswerItems.has(item.id)) && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {questions.map((q) => {
                                const answerObj = getAnswer(item, q);
                                const displayValue = formatAnswerValue(answerObj?.answer);
                                return (
                                  <div key={q.id} className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-2 py-1.5">
                                    <div className="text-[10px] text-[var(--groups1-text-secondary)]" title={getQuestionHeaderLabel(q)}>
                                      {getQuestionHeaderLabel(q)}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--groups1-text)]">{displayValue}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-r border-[var(--groups1-card-border-inner)] sticky left-0 z-10 bg-[var(--groups1-surface)]">
                      <input
                        type="checkbox"
                        checked={isAllSelectedOnCurrentPage}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
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
                    {questions.map((q) => (
                      <th
                        key={q.id}
                        title={getQuestionHeaderLabel(q)}
                        className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] bg-[var(--groups1-secondary)] max-w-[120px]"
                      >
                        <span className="truncate block max-w-[110px] normal-case">
                          {getQuestionHeaderLabel(q)}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                      Follow-up Date
                    </th>
                    {customColumns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] bg-[var(--groups1-secondary)] whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-l border-[var(--groups1-card-border-inner)] sticky right-0 z-10 bg-[var(--groups1-surface)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                    const isUpdating = updatingItemId === item.id;
                    const callLog = getCallLogData(item);
                    const followUpDate = callLog?.followUpDate || null;
                    const serialNumber = item.state === "DONE"
                      ? (item as any).completeSerialNumber || (filters.page! - 1) * pageSize + index + 1
                      : (item as any).pendingSerialNumber || (filters.page! - 1) * pageSize + index + 1;

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
                        <td className={cn(
                          "px-3 py-2 border-b border-r border-[var(--groups1-card-border-inner)] sticky left-0 z-10",
                          isAssignedToOther ? "bg-[var(--groups1-background)]" : hoveredRowId === item.id ? "bg-[var(--groups1-secondary)]" : "bg-[var(--groups1-surface)]"
                        )}>
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
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] overflow-hidden">
                          {item.student ? (
                            <Link
                              href={`/app/students/${item.student.id}`}
                              className="hover:underline"
                            >
                              <div className="font-medium text-[var(--groups1-text)] truncate" title={item.student.name}>
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
                        {questions.map((q) => {
                          const answerObj = getAnswer(item, q);
                          const displayValue = formatAnswerValue(answerObj?.answer);
                          return (
                            <td key={q.id} className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] max-w-[140px]">
                              <span
                                className="text-sm text-[var(--groups1-text)] truncate block"
                                title={displayValue !== "-" ? displayValue : undefined}
                              >
                                {displayValue}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)]">
                          {followUpDate ? (
                            <span className="text-sm text-[var(--groups1-text)]">
                              {new Date(followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                          )}
                        </td>
                        {/* Custom column cells */}
                        {customColumns.map((col) => (
                          <td key={col.key} className="px-3 py-2 border-b border-[var(--groups1-card-border-inner)] whitespace-nowrap">
                            <span className="text-sm text-[var(--groups1-text)]">
                              {(item as any).custom?.[col.key] != null ? String((item as any).custom[col.key]) : "—"}
                            </span>
                          </td>
                        ))}
                        <td className={cn(
                          "px-3 py-2 border-b border-l border-[var(--groups1-card-border-inner)] text-right sticky right-0 z-10",
                          isAssignedToOther ? "bg-[var(--groups1-background)]" : hoveredRowId === item.id ? "bg-[var(--groups1-secondary)]" : "bg-[var(--groups1-surface)]"
                        )}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                              onClick={() => {
                                setHistoryItem(item);
                                setIsHistoryModalOpen(true);
                              }}
                              title="Call History"
                              aria-label="Call History"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
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
                                  {!!item.assignedTo && (isAdmin || (currentMember?.id && item.assignedTo === currentMember.id)) && (
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        handleUnassignItem(item.id);
                                      }}
                                    >
                                      <UserMinus className="h-4 w-4" />
                                      Unassign
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
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      setHistoryItem(item);
                                      setIsHistoryModalOpen(true);
                                    }}
                                  >
                                    <History className="h-4 w-4" />
                                    Call History
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-2 pt-2 border-t border-[var(--groups1-border)] gap-2">
            {/* Record count - always visible */}
            <div className="text-xs md:text-sm text-[var(--groups1-text-secondary)]">
              {filteredItems.length === 0
                ? "No records"
                : totalItems <= pageSize
                ? `${totalItems} record${totalItems !== 1 ? "s" : ""}`
                : `Showing ${(filters.page! - 1) * pageSize + 1}–${Math.min(filters.page! * pageSize, totalItems)} of ${totalItems}`}
            </div>
            {/* Pagination buttons - only when multiple pages */}
            {totalPages > 1 && (
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
            )}
          </div>
        </CardContent>
      </Card>

      <CallExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={(next) => {
          setIsExecutionModalOpen(next);
          // When modal closes (with or without submit), refresh draft count
          if (!next) refreshDraftCount();
        }}
        callListItem={selectedItem}
        onSuccess={() => {
          handleExecutionSuccess();
          refreshDraftCount();
        }}
      />

      <CallListItemDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        callListItem={selectedItemForDetails}
        listId={listId}
        onUpdated={handleDetailsUpdated}
      />

      <CallHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={(v) => {
          setIsHistoryModalOpen(v);
          if (!v) setHistoryItem(null);
        }}
        callListItem={historyItem}
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
