"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type { QuestionPresetsListResponse } from "@/types/call-lists.types";

export function useQuestionPresets() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  return useSWR<QuestionPresetsListResponse>(
    workspaceId ? `${workspaceId}:question-presets` : null,
    async () => apiClient.getQuestionPresets(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}
