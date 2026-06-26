"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { PlatformFeature, WORKSPACE_FIELD } from "@/lib/platform-features";

/** Super-admin: global flags for the platform console. */
export function usePlatformFeatures() {
  return useSWR("platform:features", () => apiClient.getPlatformFeatures(), { revalidateOnFocus: false });
}

/** Super-admin: per-workspace feature table. */
export function usePlatformFeatureWorkspaces(query: Record<string, string | number | undefined>) {
  const key = `platform:features:workspaces:${JSON.stringify(query)}`;
  return useSWR(key, () => apiClient.getPlatformFeaturesWorkspaces(query), { revalidateOnFocus: false });
}

/**
 * App user: resolves whether a feature is usable in the current workspace.
 * Platform OFF beats workspace. Returns disabledBy so the UI can explain why.
 */
export function useFeature(feature: PlatformFeature): {
  enabled: boolean;
  disabledBy: "platform" | "workspace" | null;
  isLoading: boolean;
} {
  const { data: platform, isLoading: pLoading } = useSWR(
    "workspace:platform-features",
    () => apiClient.getWorkspacePlatformFeatures(),
    { revalidateOnFocus: false },
  );
  const { settings, isLoading: sLoading } = useWorkspaceSettings();

  const platformOn = platform ? platform.features[feature] !== false : true;
  const wsField = WORKSPACE_FIELD[feature];
  const workspaceOn = settings ? (settings as any)[wsField] !== false : true;

  let disabledBy: "platform" | "workspace" | null = null;
  if (!platformOn) disabledBy = "platform";
  else if (!workspaceOn) disabledBy = "workspace";

  return {
    enabled: platformOn && workspaceOn,
    disabledBy,
    isLoading: pLoading || sLoading,
  };
}
