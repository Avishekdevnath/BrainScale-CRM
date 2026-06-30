"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { MemberSelector } from "./MemberSelector";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, UserPlus, UserMinus, X, Trash2 } from "lucide-react";
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
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);

  const hasSelection = selectedItemIds.length > 0;

  const handleBulkStateChange = React.useCallback(
    async (state: CallListItemState) => {
      if (!hasSelection || isUpdating || disabled) return;
      setIsUpdating(true);
      try {
        await Promise.all(
          selectedItemIds.map((itemId) => apiClient.updateCallListItem(itemId, { state }))
        );
        toast.success(`${selectedItemIds.length} items marked as ${state.toLowerCase()}`);
        onItemsUpdated?.();
      } catch (error: any) {
        toast.error(error?.message || "Failed to update items");
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
        toast.success(`${selectedItemIds.length} items ${memberId ? "assigned" : "assigned to you"}`);
        setSelectedMemberId(null);
        onItemsUpdated?.();
      } catch (error: any) {
        toast.error(error?.message || "Failed to assign items");
      } finally {
        setIsUpdating(false);
      }
    },
    [hasSelection, isUpdating, disabled, listId, selectedItemIds, onItemsUpdated]
  );

  const handleBulkUnassign = React.useCallback(async () => {
    if (!hasSelection || isUpdating || disabled) return;
    setIsUpdating(true);
    try {
      await apiClient.unassignCallListItems(listId, { itemIds: selectedItemIds });
      toast.success(`${selectedItemIds.length} items unassigned`);
      onItemsUpdated?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to unassign items");
    } finally {
      setIsUpdating(false);
    }
  }, [hasSelection, isUpdating, disabled, listId, selectedItemIds, onItemsUpdated]);

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
      toast.error(error?.message || "Failed to remove students");
    } finally {
      setIsUpdating(false);
    }
  }, [hasSelection, isUpdating, disabled, listId, selectedItemIds, onItemsUpdated, onClearSelection]);

  if (!hasSelection) return null;

  const allAssignedToMe =
    !!selectionMeta && selectionMeta.assignedToMe === selectedItemIds.length;

  const btnBase =
    "h-7 px-2.5 text-xs bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] disabled:opacity-50";

  return (
    <>
      {/* Sticky bar — slides in when rows are selected */}
      <div className="sticky top-0 z-10 border-b border-[var(--groups1-border)] bg-[var(--groups1-background)] py-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Count + clear */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-[var(--groups1-border)]">
            <span className="text-sm font-semibold text-[var(--groups1-text)] tabular-nums">
              {selectedItemIds.length}
            </span>
            <span className="text-xs text-[var(--groups1-text-secondary)]">selected</span>
            <button
              type="button"
              onClick={onClearSelection}
              className="ml-1 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* State actions */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-[var(--groups1-border)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)]">
              Mark:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStateChange("QUEUED")}
              disabled={isUpdating || disabled}
              className={btnBase}
            >
              Queued
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStateChange("DONE")}
              disabled={isUpdating || disabled}
              className={btnBase}
            >
              Done
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkStateChange("SKIPPED")}
              disabled={isUpdating || disabled}
              className={btnBase}
            >
              Skip
            </Button>
          </div>

          {/* Assignment actions */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)]">
              Assign:
            </span>
            {/* Assign to me (admin always sees; non-admin sees if any unassigned) */}
            {(isAdmin || (selectionMeta && selectionMeta.unassigned > 0)) && !allAssignedToMe && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAssign(null)}
                disabled={isUpdating || disabled}
                className="h-7 px-2.5 text-xs bg-[var(--groups1-primary)] border-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:opacity-90 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                Assign to Me
              </Button>
            )}
            {/* Assign to member (admin only — member selector) */}
            {isAdmin && (
              <div className="w-44">
                <MemberSelector
                  selectedMemberId={selectedMemberId}
                  onSelectMemberId={(memberId) => {
                    setSelectedMemberId(memberId);
                    if (memberId !== null) handleBulkAssign(memberId);
                  }}
                  placeholder="Assign to..."
                  disabled={isUpdating || disabled}
                />
              </div>
            )}
            {/* Unassign */}
            {(isAdmin || allAssignedToMe || (selectionMeta && selectionMeta.assignedToMe > 0)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnassign}
                disabled={isUpdating || disabled}
                className={btnBase}
              >
                {isUpdating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserMinus className="w-3 h-3 mr-1" />}
                Unassign
              </Button>
            )}
          </div>

          {/* Remove (admin only, right-aligned, destructive) */}
          {isAdmin && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRemoveDialogOpen(true)}
                disabled={isUpdating || disabled}
                className="h-7 px-2.5 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
          )}

          {isUpdating && (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--groups1-text-secondary)]" />
          )}
        </div>
      </div>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Remove Students</DialogTitle>
            <DialogClose onClose={() => setIsRemoveDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Remove {selectedItemIds.length} student(s) from this call list? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkRemoveConfirmed} disabled={isUpdating || !hasSelection}>
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
