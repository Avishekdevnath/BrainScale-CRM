"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { FollowupCallContext } from "@/types/followups.types";

export function useFollowupCallContext(followupId: string | null) {
  return useSWR<FollowupCallContext>(
    followupId ? `followup-call-context-${followupId}` : null,
    async () => {
      if (!followupId) throw new Error("Followup ID is required");
      return apiClient.getFollowupCallContext(followupId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

