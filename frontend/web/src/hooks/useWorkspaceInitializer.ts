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

    // If workspace is already set, mark as initialized
    if (current) {
      hasInitialized.current = true;
      return;
    }

    // Load workspace from API
    const loadWorkspace = async () => {
      try {
        const workspaces = await apiClient.getWorkspaces();
        if (workspaces && workspaces.length > 0) {
          // Set first workspace as current
          setCurrentFromApi({
            id: workspaces[0].id,
            name: workspaces[0].name,
            plan: workspaces[0].plan,
            logo: workspaces[0].logo,
            timezone: workspaces[0].timezone,
          });
        } else {
          // No workspaces - redirect to create workspace
          router.push("/choose-plan");
        }
      } catch (error) {
        console.error("Failed to load workspace:", error);
        // On error, redirect to login or choose-plan
        router.push("/choose-plan");
      } finally {
        hasInitialized.current = true;
      }
    };

    loadWorkspace();
  }, [accessToken, current, setCurrentFromApi, router]);
}

