"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { useWorkspaceInitializer } from "@/hooks/useWorkspaceInitializer";
import { useChatInitializer } from "@/hooks/useChatInitializer";
import { useNotificationCount } from "@/hooks/useNotifications";
import { LayoutContent } from "./LayoutContent";
import { AuthGuard } from "@/lib/auth-guard";

function AppLayoutInner({ children }: { children: ReactNode }) {
  useWorkspaceInitializer();
  useGroupInitializer();
  useChatInitializer();
  useNotificationCount(); // Starts 30s polling for unread badge

  return (
    <Suspense fallback={
      <div className="h-screen flex bg-[var(--groups1-background)] overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    }>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthGuard>
  );
}


