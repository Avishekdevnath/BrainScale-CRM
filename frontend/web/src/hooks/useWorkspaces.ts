"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";

export interface WorkspaceSummary {
  id: string;
  name: string;
  logo: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
  timezone: string;
  role: "ADMIN" | "MEMBER";
  memberCount: number;
  groupCount: number;
  studentCount: number;
  createdAt: string;
}

export function useWorkspaces() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useSWR<WorkspaceSummary[]>(
    accessToken ? "workspaces" : null,
    async () => apiClient.getWorkspaces(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

