"use client";

import { useMemo } from "react";
import { useCurrentMember } from "./useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace-store";

/**
 * Hook to check if the current user has a specific permission
 * Since custom roles are removed, only ADMIN role has full access
 * @param resource - The resource name (e.g., 'students', 'call_lists') - kept for API compatibility
 * @param action - The action name (e.g., 'create', 'read', 'update', 'delete') - kept for API compatibility
 * @returns boolean indicating if the user is an ADMIN
 */
export function useHasPermission(resource: string, action: string): boolean {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: member } = useCurrentMember(workspaceId);

  return useMemo(() => {
    if (!member) return false;

    // ADMIN role has full access
    return member.role === "ADMIN";
  }, [member]);
}

