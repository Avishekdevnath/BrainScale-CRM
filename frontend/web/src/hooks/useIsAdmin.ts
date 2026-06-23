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

  // Check roleLevel first (set by new RBAC system), fall back to legacy role string
  const level = currentMember.roleLevel || currentMember.role?.toUpperCase();
  return level === "OWNER" || level === "ADMIN";
}

