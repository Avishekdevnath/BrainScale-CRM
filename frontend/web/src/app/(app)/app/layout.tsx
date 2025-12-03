"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceSidebar } from "@/components/common/WorkspaceSidebar";
import { GroupSidebar } from "@/components/common/GroupSidebar";
import { Topbar } from "@/components/common/Topbar";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useGroupInitializer(); // Initialize group selection
  
        // Determine if we're on a group detail page (not the groups list page)
        // /app/group-management = list page (workspace context)
        // /app/groups/[id] = detail page (group context)
        // /app/groups/[id]/students = group sub-route (also group context)
        const isGroupDetailPage = pathname?.match(/^\/app\/groups\/[^/]+(\/.*)?$/);
        const isGroupsListPage = pathname === "/app/group-management";
  
  // Show workspace name on dashboard and groups list, group selector on group detail pages
  const showWorkspaceName = pathname === "/app" || pathname === "/app/" || isGroupsListPage;
  const showGroupSelector = !!isGroupDetailPage;

  return (
    <div className="h-screen flex bg-[var(--groups1-background)] overflow-hidden">
      {isGroupDetailPage ? <GroupSidebar /> : <WorkspaceSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          showWorkspaceName={showWorkspaceName}
          showGroupSelector={showGroupSelector}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


