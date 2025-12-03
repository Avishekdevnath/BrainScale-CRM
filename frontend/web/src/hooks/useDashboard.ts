"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
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

/**
 * Hook to fetch complete dashboard summary
 */
export function useDashboardSummary(filters?: DashboardFilters) {
  const cacheKey = buildCacheKey("dashboard/summary", filters);
  
  return useSWR<DashboardSummaryResponse>(
    cacheKey,
    async () => apiClient.getDashboardSummary(filters),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch KPIs only
 */
export function useKPIs(filters?: DashboardFilters) {
  const cacheKey = buildCacheKey("dashboard/kpis", filters);
  
  return useSWR<DashboardKPIsResponse>(
    cacheKey,
    async () => apiClient.getKPIs(filters),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch calls distribution by status
 */
export function useCallsByStatus(filters?: DashboardFilters) {
  const cacheKey = buildCacheKey("dashboard/calls-by-status", filters);
  
  return useSWR<StatusDistributionItem[]>(
    cacheKey,
    async () => apiClient.getCallsByStatus(filters),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch followups distribution by status
 */
export function useFollowupsByStatus(filters?: DashboardFilters) {
  const cacheKey = buildCacheKey("dashboard/followups-by-status", filters);
  
  return useSWR<StatusDistributionItem[]>(
    cacheKey,
    async () => apiClient.getFollowupsByStatus(filters),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch students by group distribution
 */
export function useStudentsByGroup() {
  return useSWR<StudentsByGroupItem[]>(
    "dashboard/students-by-group",
    async () => apiClient.getStudentsByGroup(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch calls trend over time
 */
export function useCallsTrend(period?: "day" | "week" | "month" | "year") {
  const cacheKey = period ? `dashboard/calls-trend?period=${period}` : "dashboard/calls-trend";
  
  return useSWR<CallsTrendItem[]>(
    cacheKey,
    async () => apiClient.getCallsTrend(period),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

/**
 * Hook to fetch recent activity feed
 */
export function useRecentActivity(limit?: number) {
  const cacheKey = limit ? `dashboard/recent-activity?limit=${limit}` : "dashboard/recent-activity";
  
  return useSWR<ActivityItemAPI[]>(
    cacheKey,
    async () => apiClient.getRecentActivity(limit),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

