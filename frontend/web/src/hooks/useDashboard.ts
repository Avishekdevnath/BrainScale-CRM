"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import type {
  DashboardFilters,
  DashboardSummaryResponse,
  DashboardKPIsResponse,
  StatusDistributionItem,
  StudentsByGroupItem,
  CallsTrendItem,
  ActivityItemAPI,
} from "@/types/dashboard.types";

// Helper to build SWR cache key from filters
function buildCacheKey(baseKey: string, filters?: DashboardFilters): string {
  if (!filters) return baseKey;
  const params = new URLSearchParams();
  if (filters.groupId) params.append("groupId", filters.groupId);
  if (filters.batchId) params.append("batchId", filters.batchId);
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.append("dateTo", filters.dateTo);
  if (filters.period) params.append("period", filters.period);
  const queryString = params.toString();
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

export function useDashboardSummary(filters?: DashboardFilters) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:${buildCacheKey("dashboard/summary", filters)}`
    : null;
  return useSWR<DashboardSummaryResponse>(cacheKey, async () => apiClient.getDashboardSummary(filters), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useKPIs(filters?: DashboardFilters) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:${buildCacheKey("dashboard/kpis", filters)}`
    : null;
  return useSWR<DashboardKPIsResponse>(cacheKey, async () => apiClient.getKPIs(filters), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useCallsByStatus(filters?: DashboardFilters) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:${buildCacheKey("dashboard/calls-by-status", filters)}`
    : null;
  return useSWR<StatusDistributionItem[]>(cacheKey, async () => apiClient.getCallsByStatus(filters), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useFollowupsByStatus(filters?: DashboardFilters) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:${buildCacheKey("dashboard/followups-by-status", filters)}`
    : null;
  return useSWR<StatusDistributionItem[]>(cacheKey, async () => apiClient.getFollowupsByStatus(filters), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useStudentsByGroup() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  return useSWR<StudentsByGroupItem[]>(
    workspaceId && accessToken ? `${workspaceId}:dashboard/students-by-group` : null,
    async () => apiClient.getStudentsByGroup(),
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  );
}

export function useCallsTrend(period?: "day" | "week" | "month" | "year") {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:dashboard/calls-trend${period ? `?period=${period}` : ""}`
    : null;
  return useSWR<CallsTrendItem[]>(cacheKey, async () => apiClient.getCallsTrend(period), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

export function useRecentActivity(limit?: number) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cacheKey = workspaceId && accessToken
    ? `${workspaceId}:dashboard/recent-activity${limit ? `?limit=${limit}` : ""}`
    : null;
  return useSWR<ActivityItemAPI[]>(cacheKey, async () => apiClient.getRecentActivity(limit), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}
