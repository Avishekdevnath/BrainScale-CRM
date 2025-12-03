"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGroups, Group } from "@/hooks/useGroups";
import { useBatches } from "@/hooks/useBatches";
import { useAlignGroupsToBatch } from "@/hooks/useBatchGroups";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mutate } from "swr";

export interface GroupBatchDragDropProps {
  onSuccess?: () => void;
}

export function GroupBatchDragDrop({ onSuccess }: GroupBatchDragDropProps) {
  const [draggedGroup, setDraggedGroup] = useState<Group | null>(null);
  const [dragOverBatchId, setDragOverBatchId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const { data: groups, isLoading: isLoadingGroups, mutate: mutateGroups } = useGroups();
  const { data: batchesData, isLoading: isLoadingBatches } = useBatches({ isActive: true });
  const alignGroups = useAlignGroupsToBatch();

  const batches = batchesData?.batches || [];

  const handleDragStart = useCallback((e: React.DragEvent, group: Group) => {
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", group.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedGroup(null);
    setDragOverBatchId(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, batchId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverBatchId(batchId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverBatchId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, batchId: string) => {
    e.preventDefault();
    setDragOverBatchId(null);
    
    if (!draggedGroup) return;

    // Don't assign if already in this batch
    if (draggedGroup.batchId === batchId) {
      toast.info("Group is already in this batch");
      return;
    }

    setIsAssigning(true);
    try {
      await alignGroups.mutate(batchId, [draggedGroup.id]);
      toast.success(`Group "${draggedGroup.name}" assigned to batch`);
      await mutateGroups();
      await mutate("groups");
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to assign group to batch:", error);
      const errorMessage = error?.message || "Failed to assign group to batch";
      
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
      setIsAssigning(false);
      setDraggedGroup(null);
    }
  }, [draggedGroup, alignGroups, mutateGroups, onSuccess]);

  const handleRemoveFromBatch = useCallback(async (group: Group) => {
    if (!group.batchId) return;

    setIsAssigning(true);
    try {
      await apiClient.updateGroup(group.id, { batchId: null });
      toast.success(`Group "${group.name}" removed from batch`);
      await mutateGroups();
      await mutate("groups");
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to remove group from batch:", error);
      const errorMessage = error?.message || "Failed to remove group from batch";
      
      if (error?.status === 403) {
        toast.error("Only admins can perform this operation");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsAssigning(false);
    }
  }, [mutateGroups, onSuccess]);

  // Group groups by batch
  const groupsByBatch = React.useMemo(() => {
    const grouped: Record<string, Group[]> = {
      unassigned: [],
    };
    
    batches.forEach((batch) => {
      grouped[batch.id] = [];
    });

    groups?.forEach((group) => {
      if (group.batchId && grouped[group.batchId]) {
        grouped[group.batchId].push(group);
      } else {
        grouped.unassigned.push(group);
      }
    });

    return grouped;
  }, [groups, batches]);

  if (isLoadingGroups || isLoadingBatches) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unassigned Groups */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Unassigned Groups</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {groupsByBatch.unassigned.length === 0 ? (
            <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-4">
              No unassigned groups
            </p>
          ) : (
            <div className="space-y-2">
              {groupsByBatch.unassigned.map((group) => (
                <div
                  key={group.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, group)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] cursor-move hover:bg-[var(--groups1-secondary)] transition-colors",
                    draggedGroup?.id === group.id && "opacity-50"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--groups1-text)]">{group.name}</div>
                    <div className="text-sm text-[var(--groups1-text-secondary)]">
                      {group._count.enrollments} students
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((batch) => {
          const batchGroups = groupsByBatch[batch.id] || [];
          const isDragOver = dragOverBatchId === batch.id;

          return (
            <Card
              key={batch.id}
              variant="groups1"
              className={cn(
                "transition-all",
                isDragOver && "ring-2 ring-[var(--groups1-primary)] ring-offset-2"
              )}
              onDragOver={(e) => handleDragOver(e, batch.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, batch.id)}
            >
              <CardHeader variant="groups1">
                <CardTitle className="text-base">{batch.name}</CardTitle>
              </CardHeader>
              <CardContent variant="groups1" className="pb-6">
                {isDragOver && draggedGroup && (
                  <div className="mb-2 p-2 rounded border-2 border-dashed border-[var(--groups1-primary)] bg-[var(--groups1-primary)] bg-opacity-10">
                    <div className="text-sm font-medium text-[var(--groups1-text)]">
                      Drop "{draggedGroup.name}" here
                    </div>
                  </div>
                )}
                {batchGroups.length === 0 ? (
                  <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-4">
                    Drop groups here
                  </p>
                ) : (
                  <div className="space-y-2">
                    {batchGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-2 p-2 rounded border border-[var(--groups1-border)] bg-[var(--groups1-surface)]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[var(--groups1-text)] truncate">
                            {group.name}
                          </div>
                          <div className="text-xs text-[var(--groups1-text-secondary)]">
                            {group._count.enrollments} students
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromBatch(group)}
                          disabled={isAssigning}
                          className="h-6 w-6 p-0 text-[var(--groups1-text-secondary)] hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isAssigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-primary)]" />
              <span className="text-sm text-[var(--groups1-text)]">Assigning group...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

