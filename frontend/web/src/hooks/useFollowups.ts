"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { ListFollowupsParams, FollowupsListResponse } from "@/types/followups.types";

export function useFollowups(params?: ListFollowupsParams) {
  const key = `followups-${params?.callListId || ""}-${params?.status || ""}-${params?.assignedTo || ""}-${params?.groupId || ""}-${params?.startDate || ""}-${params?.endDate || ""}-${params?.page || 1}-${params?.size || 20}`;

  return useSWR<FollowupsListResponse>(
    key,
    async () => {
      return apiClient.listFollowups(params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

