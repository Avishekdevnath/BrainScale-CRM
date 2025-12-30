"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { MemberSelector } from "./MemberSelector";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallListItemState } from "@/types/call-lists.types";

export interface CallListBulkActionsToolbarProps {
  listId: string;
  selectedItemIds: string[];
  onItemsUpdated?: () => void;
  disabled?: boolean;
  isAdmin?: boolean;
}

export function CallListBulkActionsToolbar({
  listId,
  selectedItemIds,
  onItemsUpdated,
  disabled = false,
  isAdmin = false,
}: CallListBulkActionsToolbarProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  if (!hasSelection) return null;

  return (
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
                  await apiClient.assignCallListItems(listId, {
                    itemIds: selectedItemIds,
                  });
                  toast.success(`${selectedItemIds.length} items assigned to you`);
                  onItemsUpdated?.();
                } catch (error: any) {
                  console.error("Failed to assign items:", error);
                  const errorMessage = error?.message || "Failed to assign items";
                  toast.error(errorMessage);
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating || disabled}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] dark:font-semibold"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Assign to Me
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
        </div>
      )}
    </div>
  );
}

