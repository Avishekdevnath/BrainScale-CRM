"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { GroupCallsResponse } from "./useGroups";

export function useGroupCalls(
  groupId: string | null | undefined,
  params?: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const key = groupId
    ? `group-calls-${groupId}-${params?.page || 1}-${params?.size || 20}-${params?.startDate || ""}-${params?.endDate || ""}`
    : null;

  return useSWR<GroupCallsResponse>(
    key,
    async () => {
      if (!groupId) throw new Error("Group ID is required");
      return apiClient.getGroupCalls(groupId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

