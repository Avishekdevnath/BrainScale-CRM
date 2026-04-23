"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type { ScheduleException, ScheduleTemplateResponse } from "@/types/schedule.types";

export function useScheduleTemplate() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  return useSWR<ScheduleTemplateResponse>(
    workspaceId ? `${workspaceId}:schedule-template` : null,
    () => apiClient.getScheduleTemplate(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 3000,
    }
  );
}

export function useScheduleExceptions(date: string | null) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId && date ? `${workspaceId}:schedule-exceptions:${date}` : null;

  return useSWR<ScheduleException[]>(
    key,
    () => apiClient.listScheduleExceptions(date!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  );
}
