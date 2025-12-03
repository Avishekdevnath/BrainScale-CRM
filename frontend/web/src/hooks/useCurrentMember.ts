"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { CurrentWorkspaceMember } from "@/types/call-lists.types";

export function useCurrentMember(workspaceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<CurrentWorkspaceMember | null>(
    workspaceId ? `current-member-${workspaceId}` : null,
    async () => {
      if (!workspaceId) return null;
      return apiClient.getCurrentWorkspaceMember(workspaceId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || null,
    isLoading,
    error,
    mutate,
  };
}

