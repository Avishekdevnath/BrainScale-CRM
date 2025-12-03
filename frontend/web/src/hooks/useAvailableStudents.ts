"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { StudentsListResponse } from "@/types/students.types";

export interface AvailableStudentsParams {
  page?: number;
  size?: number;
  q?: string;
  batchId?: string;
  courseId?: string;
  moduleId?: string;
  status?: string;
}

// Helper to build SWR cache key from params
function buildCacheKey(listId: string, params?: AvailableStudentsParams): string {
  const baseKey = `call-lists/${listId}/available-students`;
  if (!params) return baseKey;
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.append("q", params.q);
  if (params.page) searchParams.append("page", String(params.page));
  if (params.size) searchParams.append("size", String(params.size));
  if (params.batchId) searchParams.append("batchId", params.batchId);
  if (params.courseId) searchParams.append("courseId", params.courseId);
  if (params.moduleId) searchParams.append("moduleId", params.moduleId);
  if (params.status) searchParams.append("status", params.status);
  const queryString = searchParams.toString();
  return queryString ? `${baseKey}?${queryString}` : baseKey;
}

/**
 * Hook to fetch available students for a call list (students not already in the list)
 */
export function useAvailableStudents(
  listId: string | null | undefined,
  params?: AvailableStudentsParams
) {
  const cacheKey = listId ? buildCacheKey(listId, params) : null;

  return useSWR<StudentsListResponse>(
    cacheKey,
    async () => {
      if (!listId) return null as any;
      return apiClient.getAvailableStudents(listId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

