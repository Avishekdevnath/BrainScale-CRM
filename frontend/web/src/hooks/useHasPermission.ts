"use client";

import { useMemo } from "react";
import { useCurrentMember } from "./useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";

/**
 * Hook to check if the current user has a specific permission
 * ADMIN role has full access; custom roles use explicit permissions.
 * @param resource - The resource name (e.g., 'students', 'call_lists')
 * @param action - The action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns boolean indicating if the user has permission
 */
export function useHasPermission(resource: string, action: string): boolean {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: member } = useCurrentMember(workspaceId);

  return useMemo(() => {
    if (!member) return false;

    // ADMIN role has full access
    if (member.role === "ADMIN") return true;

    const permissions = member.permissions || [];
    return permissions.some(
      (p) =>
        p.resource === resource &&
        (p.action === action || p.action === "manage")
    );
  }, [member]);
}

