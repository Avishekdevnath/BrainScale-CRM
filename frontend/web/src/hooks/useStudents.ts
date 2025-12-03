"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { StudentsListParams, StudentsListResponse } from "@/types/students.types";

// Helper to build SWR cache key from params
function buildCacheKey(baseKey: string, params?: StudentsListParams): string {
  if (!params) return baseKey;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.append("q", params.q);
  if (params.page) searchParams.append("page", String(params.page));
  if (params.size) searchParams.append("size", String(params.size));
  if (params.groupId) searchParams.append("groupId", params.groupId);
  if (params.courseId) searchParams.append("courseId", params.courseId);
  if (params.moduleId) searchParams.append("moduleId", params.moduleId);
  if (params.status) searchParams.append("status", params.status);
  const queryString = searchParams.toString();
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

/**
 * Hook to fetch students list with search, filters, and pagination
 */
export function useStudents(params?: StudentsListParams) {
  const cacheKey = buildCacheKey("students", params);

  return useSWR<StudentsListResponse>(
    cacheKey,
    async () => apiClient.getStudents(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}

