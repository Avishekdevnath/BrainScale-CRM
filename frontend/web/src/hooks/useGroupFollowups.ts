"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { GroupFollowupsResponse } from "./useGroups";

export function useGroupFollowups(
  groupId: string | null | undefined,
  params?: {
    page?: number;
    size?: number;
    status?: string;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    callListId?: string;
  }
) {
  const key = groupId
    ? `group-followups-${groupId}-${params?.page || 1}-${params?.size || 20}-${params?.status || ""}-${params?.assignedTo || ""}-${params?.startDate || ""}-${params?.endDate || ""}-${params?.callListId || ""}`
    : null;

  return useSWR<GroupFollowupsResponse>(
    key,
    async () => {
      if (!groupId) throw new Error("Group ID is required");
      return apiClient.getGroupFollowups(groupId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

