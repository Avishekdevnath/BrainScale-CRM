"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type {
  MyCallsResponse,
  MyCallsStats,
  GetMyCallsParams,
  GetMyCallHistoryParams,
  CallLogsResponse,
} from "@/types/call-lists.types";

export function useMyCalls(params?: GetMyCallsParams) {
  const key = params
    ? `my-calls-${JSON.stringify(params)}`
    : "my-calls";
  
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
  return useSWR<MyCallsStats>(
    "my-calls-stats",
    async () => apiClient.getMyCallsStats(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );
}

export function useAllCalls(params?: GetMyCallsParams) {
  const key = params
    ? `all-calls-${JSON.stringify(params)}`
    : "all-calls";
  
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
  const key = params
    ? `my-calls-history-${JSON.stringify(params)}`
    : "my-calls-history";
  
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

