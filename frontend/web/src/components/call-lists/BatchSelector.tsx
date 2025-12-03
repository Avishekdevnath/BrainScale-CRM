"use client";

import { useMemo } from "react";
import { useBatches } from "@/hooks/useBatches";
import { useGroups } from "@/hooks/useGroups";
import { Loader2 } from "lucide-react";

export interface BatchSelectorProps {
  value?: string;
  onChange: (batchId: string | undefined) => void;
  groupId?: string; // Filter batches by group
  disabled?: boolean;
}

export function BatchSelector({
  value,
  onChange,
  groupId,
  disabled = false,
}: BatchSelectorProps) {
  const { data: batchesData, isLoading: batchesLoading, error: batchesError } = useBatches({ isActive: true });
  const { data: groups, isLoading: groupsLoading } = useGroups();

  const batches = batchesData?.batches || [];
  const isLoading = batchesLoading || groupsLoading;

  // Filter batches by group if groupId is provided
  const availableBatches = useMemo(() => {
    if (!groupId) {
      return batches;
    }

    // Find the selected group to get its batchId
    const selectedGroup = groups?.find(g => g.id === groupId);
    
    // If group has a batchId, show that batch
    // Also always include the currently selected batch (value) if it exists
    // This ensures when editing, the existing batchId is shown even if group doesn't have it
    const batchesToShow: typeof batches = [];
    
    // Always include the currently selected batch if it exists
    if (value) {
      const selectedBatch = batches.find(b => b.id === value);
      if (selectedBatch && !batchesToShow.find(b => b.id === selectedBatch.id)) {
        batchesToShow.push(selectedBatch);
      }
    }
    
    // If group has a batchId, include that batch
    if (selectedGroup?.batchId) {
      const groupBatch = batches.find(b => b.id === selectedGroup.batchId);
      if (groupBatch && !batchesToShow.find(b => b.id === groupBatch.id)) {
        batchesToShow.push(groupBatch);
      }
    }
    
    // If no batches found but we have batches, show all (user can select any)
    // This handles the case where group doesn't have a batchId
    if (batchesToShow.length === 0 && batches.length > 0) {
      return batches;
    }
    
    return batchesToShow;
  }, [batches, groups, groupId, value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || undefined;
    onChange(newValue);
  };

  if (batchesError) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Failed to load batches. Please try again.
      </div>
    );
  }

  return (
    <div>
      <select
        id="call-list-batch"
        value={value || ""}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select batch"
      >
        <option value="">No Batch (Optional)</option>
        {isLoading ? (
          <option value="" disabled>Loading batches...</option>
        ) : availableBatches.length === 0 ? (
          <option value="" disabled>
            {groupId ? "No batches available for selected group" : "No batches available"}
          </option>
        ) : (
          availableBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
            </option>
          ))
        )}
      </select>
      {isLoading && (
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--groups1-text-secondary)]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading batches...
        </div>
      )}
    </div>
  );
}

