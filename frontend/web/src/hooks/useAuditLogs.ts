"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import type { GetAuditLogsParams, AuditLogsResponse } from "@/types/audit-logs.types";

export function useAuditLogs(params?: GetAuditLogsParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Key includes workspaceId + serialized params — null key skips fetch
  const key = workspaceId && accessToken
    ? `${workspaceId}:audit-logs-${JSON.stringify(params || {})}`
    : null;

  return useSWR<AuditLogsResponse>(
    key,
    async () => apiClient.getAuditLogs(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}
