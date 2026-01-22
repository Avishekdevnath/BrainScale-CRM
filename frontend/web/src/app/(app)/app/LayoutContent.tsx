"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WorkspaceSidebar } from "@/components/common/WorkspaceSidebar";
import { GroupSidebar } from "@/components/common/GroupSidebar";
import { ChatSidebar } from "@/components/ai-chat/ChatSidebar";
import { Topbar } from "@/components/common/Topbar";

export function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get groupId from query params (for call list detail pages accessed from group context)
  const groupId = searchParams.get("groupId");
  
  // Determine if we're on a group detail page (not the groups list page)
  // /app/group-management = list page (workspace context)
  // /app/groups/[id] = detail page (group context)
  // /app/groups/[id]/students = group sub-route (also group context)
  const isGroupDetailPage = pathname?.match(/^\/app\/groups\/[^/]+(\/.*)?$/);
  const isGroupsListPage = pathname === "/app/group-management";
  const isChatRoute = pathname?.startsWith("/app/ai-chat");
  
  // Check if we're on a call list detail page with groupId query param
  const isCallListDetailPage = pathname?.match(/^\/app\/call-lists\/[^/]+$/);
  const shouldShowGroupSidebar = isGroupDetailPage || (isCallListDetailPage && groupId);
  
  // In workspace context pages, always show workspace name (keeps header consistent across sections)
  const showWorkspaceName = !shouldShowGroupSidebar && !isChatRoute;
  const showGroupSelector = !!shouldShowGroupSidebar;

  return (
    <div className="h-screen flex bg-[var(--groups1-background)] overflow-hidden">
      {shouldShowGroupSidebar ? (
        <GroupSidebar />
      ) : isChatRoute ? (
        <ChatSidebar />
      ) : (
        <WorkspaceSidebar />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          showWorkspaceName={showWorkspaceName}
          showGroupSelector={showGroupSelector}
        />
        <main className="flex-1 overflow-y-auto">
          <div className={isChatRoute ? "h-full p-6" : "p-6"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

