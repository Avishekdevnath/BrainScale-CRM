"use client";

import { Search, Bell, Building2, Users, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/common/UserMenu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { useGroupStore } from "@/store/group";
import { useGroups } from "@/hooks/useGroups";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface TopbarProps {
  showWorkspaceName?: boolean;
  showGroupSelector?: boolean;
}

export function Topbar({ showWorkspaceName = false, showGroupSelector = false }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceName = useWorkspaceStore((state) => state.getCurrentName());
  const { current: currentGroup, setCurrent } = useGroupStore();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  
  // Extract groupId from URL if on group detail page
  const urlGroupId = pathname?.match(/^\/app\/groups\/([^/]+)$/)?.[1];
  const hasGroups = groups && groups.length > 0;
  const isGroupsRoute = pathname?.startsWith("/app/groups");
  const showGroupsButton = hasGroups || isGroupsRoute || groupsLoading;
  const isChatRoute = pathname?.startsWith("/app/ai-chat");
  
  // Use real groups data or fallback to current group
  const availableGroups = groups || [];
  const currentGroupIsValid = !!(currentGroup?.id && availableGroups.some((g) => g.id === currentGroup.id));
  const safeCurrentGroupId = currentGroupIsValid ? currentGroup!.id : undefined;
  const initialGroupId = urlGroupId || currentGroup?.id || (availableGroups[0]?.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");

  useEffect(() => {
    // If a stored group doesn't exist in the current workspace's groups list, reset it.
    if (!groupsLoading && availableGroups.length > 0 && currentGroup && !currentGroupIsValid && !urlGroupId) {
      const firstActive = availableGroups.find((g) => g.isActive) || availableGroups[0];
      if (firstActive) {
        setCurrent({ id: firstActive.id, name: firstActive.name });
        setSelectedGroupId(firstActive.id);
      }
    }

    // Update selected group from URL or store
    if (urlGroupId && availableGroups.length > 0) {
      const group = availableGroups.find((g) => g.id === urlGroupId);
      if (group && currentGroup?.id !== group.id) {
        setCurrent({ id: group.id, name: group.name });
      }
      setSelectedGroupId(urlGroupId);
    } else if (currentGroup) {
      setSelectedGroupId(currentGroup.id);
    } else if (showGroupSelector && !urlGroupId && availableGroups.length > 0) {
      // If no group selected and on groups page, default to first active group
      const defaultGroup = availableGroups.find((g) => g.isActive) || availableGroups[0];
      if (defaultGroup) {
        setCurrent({ id: defaultGroup.id, name: defaultGroup.name });
        setSelectedGroupId(defaultGroup.id);
        router.push(`/app/groups/${defaultGroup.id}`);
      }
    }
  }, [urlGroupId, currentGroup, currentGroupIsValid, groupsLoading, setCurrent, showGroupSelector, availableGroups, router]);

  const handleGroupChange = (groupId: string) => {
    const group = availableGroups.find((g) => g.id === groupId);
    if (group) {
      setCurrent({ id: group.id, name: group.name });
      setSelectedGroupId(groupId);
      router.push(`/app/groups/${groupId}`);
    }
  };

  // Determine active state for workspace, groups, and chat buttons
  const isWorkspaceRoute = pathname === "/app" || pathname === "/app/" || (pathname?.startsWith("/app/") && !pathname?.startsWith("/app/groups") && !pathname?.startsWith("/app/ai-chat"));
  
  // Get the groups link - use current group if available, otherwise use first group or group-management
  const preferredGroupId =
    urlGroupId ||
    safeCurrentGroupId ||
    currentGroup?.id ||
    availableGroups.find((g) => g.isActive)?.id ||
    availableGroups[0]?.id;

  const groupsLink = preferredGroupId ? `/app/groups/${preferredGroupId}` : "/app/group-management";

  return (
    <header className="h-16 border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] flex items-center px-4 gap-4 flex-shrink-0">
      {/* Left: Workspace/Groups/Brain Toggle Buttons */}
      <div className="flex items-center gap-2">
        <Link href="/app">
          <Button
            size="sm"
            variant={isWorkspaceRoute ? "default" : "ghost"}
            className={cn(
              "gap-2",
              isWorkspaceRoute
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Workspace</span>
          </Button>
        </Link>
        {showGroupsButton && (
          <Link href={groupsLink}>
            <Button
              size="sm"
              variant={isGroupsRoute ? "default" : "ghost"}
              className={cn(
                "gap-2",
                isGroupsRoute
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]",
                groupsLoading && "opacity-60 pointer-events-none"
              )}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Groups</span>
            </Button>
          </Link>
        )}
        <Link href="/app/ai-chat">
          <Button
            size="sm"
            variant={isChatRoute ? "default" : "ghost"}
            className={cn(
              "gap-2",
              isChatRoute
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            )}
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Brain</span>
          </Button>
        </Link>
      </div>

      {/* Workspace Name or Group Selector */}
      <div className="flex items-center gap-3">
        <div className="min-w-[180px]">
          {showWorkspaceName ? (
            <div 
              className="px-3 py-2 text-sm font-medium text-[var(--groups1-text)]"
              suppressHydrationWarning
            >
              {workspaceName}
            </div>
          ) : showGroupSelector ? (
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              )}
              aria-label="Select group"
            >
              <option value="">Select a group</option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="px-3 py-2 text-sm font-medium text-[var(--groups1-text)]"
              suppressHydrationWarning
            >
              {workspaceName}
            </div>
          )}
        </div>
      </div>

      {/* Center: Search Box */}
      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
          <input
            type="text"
            placeholder="Search students, calls..."
            className={cn(
              "w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
              "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]"
            )}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--groups1-error)] rounded-full" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
