"use client";

import { useCurrentMember } from "./useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";

/**
 * Hook to check if the current user is an admin in the current workspace
 */
export function useIsAdmin(): boolean {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember } = useCurrentMember(workspaceId);

  if (!currentMember) return false;
  
  // Check if role is ADMIN (case-insensitive)
  return currentMember.role?.toUpperCase() === "ADMIN";
}

