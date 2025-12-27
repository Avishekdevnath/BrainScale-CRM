"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "sonner";
import { useState } from "react";

export interface WorkspaceSettings {
  id: string;
  name: string;
  logo: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
  timezone: string;
  aiFeaturesEnabled: boolean;
  aiFeatures: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export function useWorkspaceSettings() {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const [isUpdating, setIsUpdating] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<WorkspaceSettings>(
    workspaceId ? `workspace-settings-${workspaceId}` : null,
    async () => {
      if (!workspaceId) return null;
      return apiClient.getWorkspace(workspaceId);
    }
  );

  const updateSettings = async (updates: Partial<WorkspaceSettings>) => {
    if (!workspaceId) {
      toast.error("No workspace selected");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await apiClient.updateWorkspace(workspaceId, updates);
      await mutate(updated, false); // Update cache optimistically
      toast.success("Settings updated successfully");
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      toast.error(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    settings: data,
    isLoading,
    error,
    isUpdating,
    updateSettings,
    mutate,
  };
}

