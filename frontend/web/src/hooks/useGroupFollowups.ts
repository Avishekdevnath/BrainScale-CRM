"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { ListFollowupsParams, FollowupsListResponse } from "@/types/followups.types";

export function useGroupFollowups(
  groupId: string | null | undefined,
  params?: Pick<
    ListFollowupsParams,
    "page" | "size" | "status" | "assignedTo" | "startDate" | "endDate" | "callListId"
  >
) {
  const key = groupId
    ? `group-followups-${groupId}-${params?.page || 1}-${params?.size || 20}-${params?.status || ""}-${params?.assignedTo || ""}-${params?.startDate || ""}-${params?.endDate || ""}-${params?.callListId || ""}`
    : null;

  return useSWR<FollowupsListResponse>(
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

