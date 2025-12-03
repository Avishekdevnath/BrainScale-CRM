"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroups, Group } from "@/hooks/useGroups";
import { useAlignGroupsToBatch, useRemoveGroupsFromBatch } from "@/hooks/useBatchGroups";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

export interface BatchGroupAlignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  mode: "align" | "remove";
  onSuccess?: () => void;
}

export function BatchGroupAlignmentModal({
  open,
  onOpenChange,
  batchId,
  batchName,
  mode,
  onSuccess,
}: BatchGroupAlignmentModalProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For 'remove' mode, only show groups already in this batch
  // For 'align' mode, show all groups
  const { data: allGroups, isLoading: isLoadingGroups } = useGroups(
    mode === "remove" ? { batchId } : undefined
  );

  const alignGroups = useAlignGroupsToBatch();
  const removeGroups = useRemoveGroupsFromBatch();

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!allGroups) return [];
    let filtered = allGroups;
    
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter((group) =>
        group.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [allGroups, debouncedSearch]);

  const handleSelectAll = () => {
    if (selectedGroupIds.size === filteredGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(filteredGroups.map((g) => g.id)));
    }
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedGroupIds.size === 0) {
      toast.error("Please select at least one group");
      return;
    }

    setIsSubmitting(true);
    try {
      const groupIdsArray = Array.from(selectedGroupIds);
      
      if (mode === "align") {
        await alignGroups.mutate(batchId, groupIdsArray);
        toast.success(`${groupIdsArray.length} group(s) aligned to ${batchName}`);
      } else {
        await removeGroups.mutate(batchId, groupIdsArray);
        toast.success(`${groupIdsArray.length} group(s) removed from ${batchName}`);
      }
      
      setSelectedGroupIds(new Set());
      setSearchQuery("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to align/remove groups:", error);
      const errorMessage = error?.message || `Failed to ${mode === "align" ? "align" : "remove"} groups`;
      
      if (error?.status === 403) {
        toast.error("Only admins can perform this operation");
      } else if (error?.status === 404) {
        toast.error("Batch or group not found");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAllSelected = filteredGroups.length > 0 && selectedGroupIds.size === filteredGroups.length;
  const isIndeterminate = selectedGroupIds.size > 0 && selectedGroupIds.size < filteredGroups.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[25vw] h-[50vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "align" ? `Align Groups to ${batchName}` : `Remove Groups from ${batchName}`}
          </DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)]"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isIndeterminate;
              }}
              onChange={handleSelectAll}
              className="rounded border-[var(--groups1-border)]"
            />
            <Label className="text-sm text-[var(--groups1-text)]">
              Select All ({filteredGroups.length} groups)
            </Label>
          </div>

          {/* Groups List */}
          <div 
            className="flex-1 overflow-y-auto border border-[var(--groups1-border)] rounded-lg"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--groups1-border) transparent'
            }}
          >
            {isLoadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--groups1-text-secondary)]">
                {mode === "remove"
                  ? "No groups in this batch"
                  : debouncedSearch
                  ? "No groups found matching your search"
                  : "No groups available"}
              </div>
            ) : (
              <div className="divide-y divide-[var(--groups1-border)]">
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroupIds.has(group.id);
                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "p-3 hover:bg-[var(--groups1-secondary)] transition-colors cursor-pointer",
                        isSelected && "bg-[var(--groups1-primary)] bg-opacity-10"
                      )}
                      onClick={() => handleToggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleGroup(group.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-[var(--groups1-border)]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[var(--groups1-text)]">{group.name}</div>
                          <div className="text-sm text-[var(--groups1-text-secondary)]">
                            {group._count.enrollments} students • {group._count.calls} calls •{" "}
                            {group._count.followups} follow-ups
                          </div>
                          {mode === "remove" && group.batch && (
                            <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                              Currently in: {group.batch.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Count */}
          {selectedGroupIds.size > 0 && (
            <div className="text-sm text-[var(--groups1-text-secondary)]">
              {selectedGroupIds.size} group(s) selected
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--groups1-border)]">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedGroupIds(new Set());
              setSearchQuery("");
              onOpenChange(false);
            }}
            disabled={isSubmitting}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedGroupIds.size === 0}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === "align" ? "Aligning..." : "Removing..."}
              </>
            ) : (
              <>
                {mode === "align" ? "Align Groups" : "Remove Groups"} ({selectedGroupIds.size})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

