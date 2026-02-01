"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGroupStore } from "@/store/group";
import { useGroups } from "@/hooks/useGroups";

export function useGroupInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const { current, setCurrent, hydrate } = useGroupStore();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = useRef(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Only initialize when groups are loaded and we haven't initialized yet
    if (!groupsLoading && groups && !hasInitialized.current) {
      // No accessible groups (or none exist) => clear selection so we don't use a fake/default groupId.
      if (groups.length === 0) {
        setCurrent(null);
        hasInitialized.current = true;
        setIsInitializing(false);
        return;
      }

      // Check if current group exists and is active
      if (current) {
        const currentGroupInList = groups.find(
          (g) => g.id === current.id && g.isActive
        );
        if (currentGroupInList) {
          // Current group is valid and active, mark as initialized
          hasInitialized.current = true;
          setIsInitializing(false);
          return;
        }
      }

      // Find first active group
      const firstActiveGroup = groups.find((g) => g.isActive);
      if (firstActiveGroup) {
        const group = {
          id: firstActiveGroup.id,
          name: firstActiveGroup.name,
        };
        setCurrent(group);
      } else if (groups.length > 0) {
        // Fallback to first group if no active groups
        const firstGroup = groups[0];
        setCurrent({ id: firstGroup.id, name: firstGroup.name });
      }
      hasInitialized.current = true;
      setIsInitializing(false);
    }
  }, [groups, groupsLoading, current, setCurrent]);

  useEffect(() => {
    // Handle redirect: if on /app/groups route without groupId, redirect to selected group's dashboard
    const isGroupsRoute = pathname === "/app/groups";
    const hasGroupId = pathname?.match(/^\/app\/groups\/([^/]+)/)?.[1];

    if (isGroupsRoute && !hasGroupId && !isInitializing && !groupsLoading) {
      // If we have a current group, redirect to it
      if (current?.id) {
        router.replace(`/app/groups/${current.id}`);
      } else if (groups && groups.length > 0) {
        // Otherwise redirect to first active group or first group
        const firstActive = groups.find((g) => g.isActive) || groups[0];
        if (firstActive) {
          router.replace(`/app/groups/${firstActive.id}`);
        }
      }
    }
  }, [pathname, current, isInitializing, groupsLoading, groups, router]);

  return {
    isLoading: groupsLoading || isInitializing,
    currentGroup: current,
  };
}

