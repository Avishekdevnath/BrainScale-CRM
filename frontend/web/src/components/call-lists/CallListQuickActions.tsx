"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { MemberSelector } from "./MemberSelector";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CallListItemState } from "@/types/call-lists.types";

export interface CallListQuickActionsProps {
  listId: string;
  selectedItemIds: string[];
  onItemsUpdated?: () => void;
  disabled?: boolean;
  isAdmin?: boolean; // Whether the current user is an admin
}

export function CallListQuickActions({
  listId,
  selectedItemIds,
  onItemsUpdated,
  disabled = false,
  isAdmin = false,
}: CallListQuickActionsProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

  const hasSelection = selectedItemIds.length > 0;

  const handleBulkStateChange = React.useCallback(
    async (state: CallListItemState) => {
      if (!hasSelection || isUpdating || disabled) return;

      setIsUpdating(true);
      try {
        // Update each item individually (API doesn't support bulk state update)
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

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
        Mark as Queued {hasSelection && `(${selectedItemIds.length})`}
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
        Mark as Done {hasSelection && `(${selectedItemIds.length})`}
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
        Skip {hasSelection && `(${selectedItemIds.length})`}
      </Button>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!hasSelection || isUpdating || disabled) return;
              setIsUpdating(true);
              try {
                // Assign to current user by not providing assignedTo
                await apiClient.assignCallListItems(listId, {
                  itemIds: selectedItemIds,
                  // assignedTo is undefined, which means assign to current user
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
            disabled={!hasSelection || isUpdating || disabled}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Assign to Me {hasSelection && `(${selectedItemIds.length})`}
          </Button>
        )}
        <MemberSelector
          selectedMemberId={selectedMemberId}
          onSelectMemberId={(memberId) => {
            setSelectedMemberId(memberId);
            if (memberId !== null) {
              handleBulkAssign(memberId);
            }
          }}
          placeholder={`Assign To... ${hasSelection ? `(${selectedItemIds.length})` : ""}`}
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
          Unassign Selected {hasSelection && `(${selectedItemIds.length})`}
        </Button>
      </div>
    </div>
  );
}

