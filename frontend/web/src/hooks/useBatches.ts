"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type {
  Batch,
  BatchListParams,
  BatchListResponse,
  BatchStatsResponse,
  StudentBatch,
} from "@/types/batches.types";

export function useBatches(params?: BatchListParams) {
  const key = params
    ? `batches-${JSON.stringify(params)}`
    : "batches";
  
  return useSWR<BatchListResponse>(
    key,
    async () => apiClient.listBatches(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useBatch(batchId: string | null) {
  return useSWR<Batch | null>(
    batchId ? `batch-${batchId}` : null,
    async () => (batchId ? apiClient.getBatch(batchId) : null),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useBatchStats(batchId: string | null) {
  return useSWR<BatchStatsResponse | null>(
    batchId ? `batch-stats-${batchId}` : null,
    async () => (batchId ? apiClient.getBatchStats(batchId) : null),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useStudentBatches(studentId: string | null) {
  return useSWR<StudentBatch[]>(
    studentId ? `student-batches-${studentId}` : null,
    async () => (studentId ? apiClient.getStudentBatches(studentId) : []),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

