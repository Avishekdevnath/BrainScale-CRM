"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Group } from "./useGroups";

export function useGroup(groupId: string | null | undefined) {
  return useSWR<Group>(
    groupId ? `group-${groupId}` : null,
    async () => {
      if (!groupId) throw new Error("Group ID is required");
      return apiClient.getGroupById(groupId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

