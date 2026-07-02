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

export function usePlatformUsers(query: Record<string, string | number | undefined>) {
  const key = `platform:users:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.platformListUsers(query), { revalidateOnFocus: false });
}

export function usePlatformAudit(query: Record<string, string | number | undefined>) {
  const key = `platform:audit:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.platformListAudit(query), { revalidateOnFocus: false });
}

export function usePlatformDeletedWorkspaces() {
  return useSWR("platform:deleted-workspaces", () => apiClient.platformListDeletedWorkspaces(), {
    revalidateOnFocus: false,
  });
}

export function usePlatformUser(id: string | null) {
  return useSWR(id ? `platform:user:${id}` : null, () => apiClient.platformGetUser(id as string), {
    revalidateOnFocus: false,
  });
}

export function usePlatformAnnouncements(query: { page?: number; size?: number }) {
  const key = `platform:announcements:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.platformListAnnouncements(query), { revalidateOnFocus: false });
}

export function usePlatformAnnouncement(id: string | null) {
  return useSWR(id ? `platform:announcement:${id}` : null, () => apiClient.platformGetAnnouncement(id as string), {
    revalidateOnFocus: false,
  });
}

export function usePlatformUsage(query: Record<string, string | number | boolean | undefined>) {
  const key = `platform:usage:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.platformUsageList(query), { revalidateOnFocus: false });
}

export function usePlatformUsageSettings() {
  return useSWR("platform:usage-settings", () => apiClient.platformUsageSettings(), {
    revalidateOnFocus: false,
  });
}

export function usePlatformFeedback(query: Record<string, string | number | undefined>) {
  const key = `platform:feedback:${JSON.stringify(query)}`;
  // Revalidate on focus so new submissions appear when the admin returns to the inbox.
  return useSWR(key, () => apiClient.platformListFeedback(query), { revalidateOnFocus: true });
}
