"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";

export function useWorkspaceInitializer() {
  const router = useRouter();
  const { current, setCurrentFromApi } = useWorkspaceStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once and if we have an access token
    if (hasInitialized.current || !accessToken) {
      return;
    }

    // Load workspace from API
    const loadWorkspace = async () => {
      try {
        const workspaces = await apiClient.getWorkspaces();
        if (workspaces && workspaces.length > 0) {
          const currentIsValid = current && workspaces.some((w) => w.id === current.id);
          const nextWorkspace = currentIsValid ? current : workspaces[0];

          if (!currentIsValid) {
            setCurrentFromApi({
              id: nextWorkspace.id,
              name: nextWorkspace.name,
              plan: nextWorkspace.plan,
              logo: nextWorkspace.logo,
              timezone: nextWorkspace.timezone,
            });
          }
        } else {
          // No workspaces - redirect to create workspace
          router.push("/create-workspace");
        }
      } catch (error) {
        console.error("Failed to load workspace:", error);
        // On error, redirect to create workspace
        router.push("/create-workspace");
      } finally {
        hasInitialized.current = true;
      }
    };

    loadWorkspace();
  }, [accessToken, current, setCurrentFromApi, router]);
}

