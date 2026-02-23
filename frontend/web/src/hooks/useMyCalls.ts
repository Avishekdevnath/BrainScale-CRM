"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import type {
  MyCallsResponse,
  MyCallsStats,
  GetMyCallsParams,
  GetMyCallHistoryParams,
  CallLogsResponse,
} from "@/types/call-lists.types";

export function useMyCalls(params?: GetMyCallsParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const key = workspaceId && accessToken
    ? params ? `${workspaceId}:my-calls-${JSON.stringify(params)}` : `${workspaceId}:my-calls`
    : null;

  return useSWR<MyCallsResponse>(
    key,
    async () => apiClient.getMyCalls(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useMyCallsStats() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const key = workspaceId && accessToken ? `${workspaceId}:my-calls-stats` : null;
  return useSWR<MyCallsStats>(
    key,
    async () => apiClient.getMyCallsStats(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );
}

export function useAllCalls(params?: GetMyCallsParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const key = workspaceId && accessToken
    ? params ? `${workspaceId}:all-calls-${JSON.stringify(params)}` : `${workspaceId}:all-calls`
    : null;

  return useSWR<MyCallsResponse>(
    key,
    async () => apiClient.getAllCalls(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useMyCallHistory(params?: GetMyCallHistoryParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const key = workspaceId && accessToken
    ? params ? `${workspaceId}:my-calls-history-${JSON.stringify(params)}` : `${workspaceId}:my-calls-history`
    : null;

  return useSWR<CallLogsResponse>(
    key,
    async () => apiClient.getMyCallHistory(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

