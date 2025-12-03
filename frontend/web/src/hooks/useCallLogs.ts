"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type {
  CallLog,
  CallLogsResponse,
  GetCallLogsParams,
} from "@/types/call-lists.types";

export function useCallLogs(params?: GetCallLogsParams) {
  const key = params
    ? `call-logs-${JSON.stringify(params)}`
    : "call-logs";
  
  return useSWR<CallLogsResponse>(
    key,
    async () => apiClient.getCallLogs(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useCallLog(logId: string | null | undefined) {
  return useSWR<CallLog | null>(
    logId ? `call-log-${logId}` : null,
    async () => (logId ? apiClient.getCallLog(logId) : null),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useStudentCallLogs(
  studentId: string | null | undefined,
  params?: GetCallLogsParams
) {
  const key = studentId
    ? `student-call-logs-${studentId}-${JSON.stringify(params || {})}`
    : null;
  
  return useSWR<CallLogsResponse>(
    key,
    async () => {
      if (!studentId) return null as any;
      return apiClient.getStudentCallLogs(studentId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useCallListCallLogs(
  callListId: string | null | undefined,
  params?: GetCallLogsParams
) {
  const key = callListId
    ? `call-list-call-logs-${callListId}-${JSON.stringify(params || {})}`
    : null;
  
  return useSWR<CallLogsResponse>(
    key,
    async () => {
      if (!callListId) return null as any;
      return apiClient.getCallListCallLogs(callListId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

