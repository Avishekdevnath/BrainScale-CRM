"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";

export function useCurrentUser() {
  return useSWR("platform:me", () => apiClient.getMe(), { revalidateOnFocus: false });
}

export function usePlatformOverview() {
  return useSWR("platform:overview", () => apiClient.platformOverview(), { revalidateOnFocus: false });
}

export function usePlatformWorkspaces(query: Record<string, string | number | undefined>) {
  const key = `platform:workspaces:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.platformListWorkspaces(query), { revalidateOnFocus: false });
}

export function usePlatformWorkspace(id: string | null) {
  return useSWR(id ? `platform:workspace:${id}` : null, () => apiClient.platformGetWorkspace(id as string), {
    revalidateOnFocus: false,
  });
}
