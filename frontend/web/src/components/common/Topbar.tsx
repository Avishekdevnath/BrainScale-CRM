"use client";

import { Search, Bell, Building2, Users, Brain, Menu, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/common/UserMenu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { useGroupStore } from "@/store/group";
import { useGroups } from "@/hooks/useGroups";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface TopbarProps {
  showWorkspaceName?: boolean;
  showGroupSelector?: boolean;
  onMenuClick?: () => void;
}

export function Topbar({ showWorkspaceName = false, showGroupSelector = false, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceName = useWorkspaceStore((state) => state.getCurrentName());
  const currentWorkspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const setCurrentWorkspaceFromApi = useWorkspaceStore((state) => state.setCurrentFromApi);
  const { current: currentGroup, setCurrent } = useGroupStore();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  
  // Extract groupId from URL if on group detail page
  const urlGroupId = pathname?.match(/^\/app\/groups\/([^/]+)$/)?.[1];
  const hasGroups = groups && groups.length > 0;
  const isGroupsRoute = pathname?.startsWith("/app/groups");
  const showGroupsButton = hasGroups || isGroupsRoute || groupsLoading;
  const isChatRoute = pathname?.startsWith("/app/ai-chat");
  
  // Use real groups data or fallback to current group
  const availableGroups = groups || [];

  const handleGroupChange = (groupId: string) => {
    const group = availableGroups.find((g) => g.id === groupId);
    if (group) {
      setCurrent({ id: group.id, name: group.name });
      router.push(`/app/groups/${groupId}`);
    }
  };

  // Determine active state for workspace, groups, and chat buttons
  const isWorkspaceRoute = pathname === "/app" || pathname === "/app/" || (pathname?.startsWith("/app/") && !pathname?.startsWith("/app/groups") && !pathname?.startsWith("/app/ai-chat"));
  
  // Get the groups link - use current group if available, otherwise use first group or group-management
  const preferredGroupId =
    urlGroupId ||
    currentGroup?.id ||
    availableGroups.find((g) => g.isActive)?.id ||
    availableGroups[0]?.id;

  const groupsLink = preferredGroupId ? `/app/groups/${preferredGroupId}` : "/app/group-management";

  const activeContext: "Workspace" | "Groups" | "Brain" = isChatRoute ? "Brain" : showGroupSelector ? "Groups" : "Workspace";
  const ActiveIcon = activeContext === "Brain" ? Brain : activeContext === "Groups" ? Users : Building2;

  return (
    <header className="h-16 border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] sticky top-0 z-40 shadow-sm flex items-center justify-between md:justify-start px-4 gap-4 flex-shrink-0">
      {/* Mobile: Menu + Brand (from guides/ui/mobile_tobbar.jsx) */}
      <div className="flex items-center gap-3 md:hidden min-w-0 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg",
            "text-[var(--groups1-text,#0f172a)] hover:bg-[var(--groups1-secondary,#eef2ff)] transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring,#a5b4fc)]"
          )}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="text-base font-bold tracking-tight text-[var(--groups1-text,#0f172a)] whitespace-nowrap pr-1">
            BrainScale
          </div>
          <div className="text-[11px] text-[var(--groups1-text-secondary,#475569)] truncate" suppressHydrationWarning>
            {workspaceName}
          </div>
        </div>
      </div>

      {/* Left: Workspace/Groups/Brain Toggle Buttons */}
      <div className="hidden md:flex items-center gap-2">
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
      <div className="hidden md:flex items-center gap-3">
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
              value={urlGroupId || currentGroup?.id || ""}
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
      <div className="hidden md:flex flex-1 justify-center max-w-md mx-auto">
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
        {/* Mobile: Logo on the right */}
        <div className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-[var(--groups1-primary,#4f46e5)] flex-shrink-0">
          <span className="text-[var(--groups1-btn-primary-text,#ffffff)] font-bold text-xs italic">BS</span>
        </div>

        {/* Mobile: Single context toggle (Workspace / Groups / Brain) */}
        <div className="md:hidden flex items-center gap-2">
          <DropdownMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Context menu"
                suppressHydrationWarning
                className={cn(
                  "flex items-center gap-1 p-2 rounded-lg transition-all border",
                  "bg-[var(--groups1-secondary,#eef2ff)] text-[var(--groups1-primary,#4f46e5)] border-[var(--groups1-border,#e5e7eb)]",
                  "active:bg-[var(--groups1-secondary,#eef2ff)]"
                )}
              >
                <ActiveIcon className="w-5 h-5" />
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    contextMenuOpen && "rotate-180"
                  )}
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                align="end"
                className="min-w-[240px] rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-xl z-[70]"
              >
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className="flex cursor-pointer select-none items-center gap-3 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                    suppressHydrationWarning
                  >
                    <Building2 className="w-4 h-4" />
                    Workspace
                    <span className="ml-auto text-xs text-[var(--groups1-text-secondary)] truncate max-w-[120px]" suppressHydrationWarning>
                      {workspaceName || "Select"}
                    </span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={6}
                      alignOffset={-6}
                      className="min-w-[260px] rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-xl z-[80]"
                    >
                      <div className="px-3 py-2">
                        <div className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                          Workspaces
                        </div>
                      </div>
                      <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
                      {(workspaces || []).map((ws) => (
                        <DropdownMenu.Item
                          key={ws.id}
                          className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                      onSelect={(event) => {
                        event.preventDefault();
                        setCurrentWorkspaceFromApi({
                          id: ws.id,
                          name: ws.name,
                          plan: ws.plan,
                          logo: ws.logo,
                          timezone: ws.timezone,
                        });
                        setCurrent(null);
                        setContextMenuOpen(false);
                        router.push("/app");
                      }}
                    >
                          <span className="w-4 h-4 flex items-center justify-center">
                            {currentWorkspaceId === ws.id ? <Check className="w-4 h-4" /> : null}
                          </span>
                          <span className="flex-1 min-w-0 truncate">{ws.name}</span>
                        </DropdownMenu.Item>
                      ))}
                      {(!workspaces || workspaces.length === 0) && !workspacesLoading && (
                        <div className="px-3 py-2 text-sm text-[var(--groups1-text-secondary)]">No workspaces</div>
                      )}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger
                    className="flex cursor-pointer select-none items-center gap-3 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                    suppressHydrationWarning
                  >
                    <Users className="w-4 h-4" />
                    Groups
                    <span className="ml-auto text-xs text-[var(--groups1-text-secondary)] truncate max-w-[120px]" suppressHydrationWarning>
                      {currentGroup?.name || "Select"}
                    </span>
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      sideOffset={6}
                      alignOffset={-6}
                      className="min-w-[260px] rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-xl z-[80]"
                    >
                      <div className="px-3 py-2">
                        <div className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                          Groups
                        </div>
                      </div>
                      <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
                      {(availableGroups || []).map((group) => (
                        <DropdownMenu.Item
                          key={group.id}
                          className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                          onSelect={(event) => {
                            event.preventDefault();
                            setCurrent({ id: group.id, name: group.name });
                            setContextMenuOpen(false);
                            router.push(`/app/groups/${group.id}`);
                          }}
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            {currentGroup?.id === group.id ? <Check className="w-4 h-4" /> : null}
                          </span>
                          <span className="flex-1 min-w-0 truncate">{group.name}</span>
                        </DropdownMenu.Item>
                      ))}
                      {(!availableGroups || availableGroups.length === 0) && !groupsLoading && (
                        <div className="px-3 py-2 text-sm text-[var(--groups1-text-secondary)]">No groups</div>
                      )}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>

                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-3 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
                  onSelect={(event) => {
                    event.preventDefault();
                    setContextMenuOpen(false);
                    router.push("/app/ai-chat");
                  }}
                >
                  <Brain className="w-4 h-4" />
                  Brain
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <div className="w-px h-6 bg-[var(--groups1-border)] mx-1" />
        </div>

        <button
          type="button"
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="hidden md:relative w-10 h-10 md:flex items-center justify-center rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
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
