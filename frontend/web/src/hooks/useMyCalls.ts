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
  const userId = useAuthStore((state) => state.user?.id);
  const scope = `${workspaceId || "no-workspace"}:${userId || "no-user"}`;
  const key = params
    ? `${scope}:my-calls-${JSON.stringify(params)}`
    : `${scope}:my-calls`;
  
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
  const userId = useAuthStore((state) => state.user?.id);
  const scope = `${workspaceId || "no-workspace"}:${userId || "no-user"}`;
  return useSWR<MyCallsStats>(
    `${scope}:my-calls-stats`,
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
  const userId = useAuthStore((state) => state.user?.id);
  const scope = `${workspaceId || "no-workspace"}:${userId || "no-user"}`;
  const key = params
    ? `${scope}:all-calls-${JSON.stringify(params)}`
    : `${scope}:all-calls`;
  
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
  const userId = useAuthStore((state) => state.user?.id);
  const scope = `${workspaceId || "no-workspace"}:${userId || "no-user"}`;
  const key = params
    ? `${scope}:my-calls-history-${JSON.stringify(params)}`
    : `${scope}:my-calls-history`;
  
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

