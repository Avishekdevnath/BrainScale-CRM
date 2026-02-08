"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { MemberSelector } from "./MemberSelector";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, UserPlus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallListItemState } from "@/types/call-lists.types";

export interface CallListBulkActionsToolbarProps {
  listId: string;
  selectedItemIds: string[];
  onItemsUpdated?: () => void;
  onClearSelection?: () => void;
  disabled?: boolean;
  isAdmin?: boolean;
  selectionMeta?: {
    assignedToMe: number;
    unassigned: number;
    assignedToOthers: number;
  };
}

export function CallListBulkActionsToolbar({
  listId,
  selectedItemIds,
  onItemsUpdated,
  onClearSelection,
  disabled = false,
  isAdmin = false,
  selectionMeta,
}: CallListBulkActionsToolbarProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);

  const hasSelection = selectedItemIds.length > 0;

  // Auto-collapse when selection is cleared
  React.useEffect(() => {
    if (!hasSelection) {
      setIsExpanded(false);
    }
  }, [hasSelection]);

  const handleBulkStateChange = React.useCallback(
    async (state: CallListItemState) => {
      if (!hasSelection || isUpdating || disabled) return;

      setIsUpdating(true);
      try {
        await Promise.all(
          selectedItemIds.map((itemId) =>
            apiClient.updateCallListItem(itemId, { state })
          )
        );
        toast.success(`${selectedItemIds.length} items updated to ${state}`);
        onItemsUpdated?.();
      } catch (error: any) {
        console.error("Failed to update items:", error);
        const errorMessage = error?.message || "Failed to update items";
        toast.error(errorMessage);
      } finally {
        setIsUpdating(false);
      }
    },
    [hasSelection, isUpdating, disabled, selectedItemIds, onItemsUpdated]
  );

  const handleBulkAssign = React.useCallback(
    async (memberId: string | null) => {
      if (!hasSelection || isUpdating || disabled) return;

      setIsUpdating(true);
      try {
        await apiClient.assignCallListItems(listId, {
          itemIds: selectedItemIds,
          assignedTo: memberId || undefined,
        });
        toast.success(
          `${selectedItemIds.length} items ${memberId ? "assigned" : "unassigned"}`
        );
        setSelectedMemberId(null);
        onItemsUpdated?.();
      } catch (error: any) {
        console.error("Failed to assign items:", error);
        const errorMessage = error?.message || "Failed to assign items";
        toast.error(errorMessage);
      } finally {
        setIsUpdating(false);
      }
    },
    [hasSelection, isUpdating, disabled, listId, selectedItemIds, onItemsUpdated]
  );

  const handleBulkRemoveConfirmed = React.useCallback(async () => {
    if (!hasSelection || isUpdating || disabled) return;

    setIsUpdating(true);
    try {
      const result = await apiClient.removeCallListItems(listId, { itemIds: selectedItemIds });
      toast.success(`${result.removedCount} student(s) removed from call list`);
      setIsRemoveDialogOpen(false);
      onItemsUpdated?.();
      onClearSelection?.();
    } catch (error: any) {
      console.error("Failed to remove items:", error);
      const errorMessage = error?.message || "Failed to remove students";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [hasSelection, isUpdating, disabled, listId, selectedItemIds, onItemsUpdated, onClearSelection]);

  if (!hasSelection) return null;

  const shouldShowUnassignInCollapsed =
    !!selectionMeta && selectionMeta.assignedToMe === selectedItemIds.length;
  const shouldShowMemberUnassignInCollapsed =
    !isAdmin && !!selectionMeta && selectionMeta.assignedToMe > 0 && selectionMeta.assignedToOthers === 0;

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-10 bg-[var(--groups1-background)] border-b border-[var(--groups1-border)] transition-all duration-200",
          isExpanded ? "py-3" : "py-2"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Collapsed view */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-[var(--groups1-text)]">
              {selectedItemIds.length} selected
            </span>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!hasSelection || isUpdating || disabled) return;
                  setIsUpdating(true);
                  try {
                    if (shouldShowUnassignInCollapsed) {
                      await apiClient.unassignCallListItems(listId, { itemIds: selectedItemIds });
                      toast.success(`${selectedItemIds.length} items unassigned`);
                    } else {
                      await apiClient.assignCallListItems(listId, { itemIds: selectedItemIds });
                      toast.success(`${selectedItemIds.length} items assigned to you`);
                    }
                    onItemsUpdated?.();
                  } catch (error: any) {
                    console.error("Failed to update assignment:", error);
                    const errorMessage =
                      error?.message || (shouldShowUnassignInCollapsed ? "Failed to unassign items" : "Failed to assign items");
                    toast.error(errorMessage);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating || disabled}
                className={cn(
                  "dark:font-semibold",
                  shouldShowUnassignInCollapsed
                    ? "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    : "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                )}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : !shouldShowUnassignInCollapsed ? (
                  <UserPlus className="w-4 h-4 mr-2" />
                ) : null}
                {shouldShowUnassignInCollapsed ? "Unassign" : "Assign to Me"}
              </Button>
            )}
            {!isAdmin && shouldShowMemberUnassignInCollapsed && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!hasSelection || isUpdating || disabled) return;
                  setIsUpdating(true);
                  try {
                    await apiClient.unassignCallListItems(listId, { itemIds: selectedItemIds });
                    toast.success(
                      `Unassigned ${selectionMeta?.assignedToMe ?? selectedItemIds.length} item(s) from you`
                    );
                    onItemsUpdated?.();
                  } catch (error: any) {
                    console.error("Failed to unassign items:", error);
                    toast.error(error?.message || "Failed to unassign items");
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating || disabled}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Unassign from Me
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] dark:hover:bg-[var(--groups1-secondary)]"
          >
            {isExpanded ? (
              <>
                <span className="text-xs mr-1">Less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="text-xs mr-1">More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>

        {/* Expanded view */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[var(--groups1-border)] flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkStateChange("QUEUED")}
            disabled={!hasSelection || isUpdating || disabled}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Mark as Queued
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkStateChange("DONE")}
            disabled={!hasSelection || isUpdating || disabled}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Mark as Done
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkStateChange("SKIPPED")}
            disabled={!hasSelection || isUpdating || disabled}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Skip
          </Button>

          <div className="flex items-center gap-2">
            <MemberSelector
              selectedMemberId={selectedMemberId}
              onSelectMemberId={(memberId) => {
                setSelectedMemberId(memberId);
                if (memberId !== null) {
                  handleBulkAssign(memberId);
                }
              }}
              placeholder="Assign To..."
              disabled={!hasSelection || isUpdating || disabled}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!hasSelection || isUpdating || disabled) return;
                setIsUpdating(true);
                try {
                  await apiClient.unassignCallListItems(listId, {
                    itemIds: selectedItemIds,
                  });
                  toast.success(`${selectedItemIds.length} items unassigned`);
                  onItemsUpdated?.();
                } catch (error: any) {
                  console.error("Failed to unassign items:", error);
                  const errorMessage = error?.message || "Failed to unassign items";
                  toast.error(errorMessage);
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={!hasSelection || isUpdating || disabled}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Unassign
            </Button>
          </div>

          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsRemoveDialogOpen(true)}
              disabled={!hasSelection || isUpdating || disabled}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove from List
            </Button>
          )}
        </div>
        )}
      </div>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Students</DialogTitle>
            <DialogClose onClose={() => setIsRemoveDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Remove {selectedItemIds.length} student(s) from this call list? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkRemoveConfirmed}
              disabled={isUpdating || !hasSelection}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

