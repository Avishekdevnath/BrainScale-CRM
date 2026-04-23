"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WorkspaceSidebar } from "@/components/common/WorkspaceSidebar";
import { GroupSidebar } from "@/components/common/GroupSidebar";
import { ChatSidebar } from "@/components/ai-chat/ChatSidebar";
import TeamChatSidebar from "./team-chat/components/TeamChatSidebar";
import { Topbar } from "@/components/common/Topbar";
import { MobileSidebarDrawer } from "@/components/common/MobileSidebarDrawer";
import { useEffect, useMemo, useState } from "react";

export function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const groupId = searchParams.get("groupId");

  const isGroupDetailPage = pathname?.match(/^\/app\/groups\/[^/]+(\/.*)?$/);
  const isGroupsListPage = pathname === "/app/group-management";
  const isChatRoute = pathname?.startsWith("/app/ai-chat");
  const isTeamChatRoute = pathname?.startsWith("/app/team-chat");

  const isCallListDetailPage = pathname?.match(/^\/app\/call-lists\/[^/]+$/);
  const shouldShowGroupSidebar = isGroupDetailPage || (isCallListDetailPage && groupId);

  const showWorkspaceName = !shouldShowGroupSidebar && !isChatRoute && !isTeamChatRoute;
  const showGroupSelector = !!shouldShowGroupSidebar;

  const mobileTitle = useMemo(() => {
    if (shouldShowGroupSidebar) return "Group";
    if (isChatRoute) return "Brain";
    if (isTeamChatRoute) return "Team";
    return "Workspace";
  }, [isChatRoute, isTeamChatRoute, shouldShowGroupSidebar]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const renderSidebar = (mode: "desktop" | "mobile", onNavigate?: () => void) => {
    if (shouldShowGroupSidebar) {
      return <GroupSidebar mode={mode} onNavigate={onNavigate} />;
    }
    if (isChatRoute) {
      return <ChatSidebar mode={mode} onNavigate={onNavigate} />;
    }
    if (isTeamChatRoute) {
      return <TeamChatSidebar mode={mode} onNavigate={onNavigate} />;
    }
    return <WorkspaceSidebar mode={mode} onNavigate={onNavigate} />;
  };

  return (
    <div className="h-screen flex bg-[var(--groups1-background)] overflow-hidden">
      {renderSidebar("desktop")}

      <MobileSidebarDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={mobileTitle}
      >
        {renderSidebar("mobile", () => setMobileNavOpen(false))}
      </MobileSidebarDrawer>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          showWorkspaceName={showWorkspaceName}
          showGroupSelector={showGroupSelector}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className={isChatRoute || isTeamChatRoute ? "h-full p-0 md:p-6" : "p-4 md:p-6"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
