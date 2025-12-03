"use client";

import useSWR from "swr";
import { mutate } from "swr";
import { apiClient } from "@/lib/api-client";
import type { Group } from "@/hooks/useGroups";

export function useBatchGroups(batchId: string | null | undefined) {
  return useSWR<Group[]>(
    batchId ? `batch-groups-${batchId}` : null,
    async () => {
      if (!batchId) throw new Error("Batch ID is required");
      return apiClient.getGroupsByBatch(batchId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useAlignGroupsToBatch() {
  return {
    mutate: async (batchId: string, groupIds: string[]) => {
      const result = await apiClient.alignGroupsToBatch(batchId, groupIds);
      // Invalidate relevant caches
      await mutate("groups");
      await mutate(`batch-groups-${batchId}`);
      await mutate(`batch-${batchId}`);
      return result;
    },
  };
}

export function useRemoveGroupsFromBatch() {
  return {
    mutate: async (batchId: string, groupIds: string[]) => {
      const result = await apiClient.removeGroupsFromBatch(batchId, groupIds);
      // Invalidate relevant caches
      await mutate("groups");
      await mutate(`batch-groups-${batchId}`);
      await mutate(`batch-${batchId}`);
      return result;
    },
  };
}

