"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { useWorkspaceInitializer } from "@/hooks/useWorkspaceInitializer";
import { useChatInitializer } from "@/hooks/useChatInitializer";
import { LayoutContent } from "./LayoutContent";

export default function AppLayout({ children }: { children: ReactNode }) {
  useWorkspaceInitializer(); // Initialize workspace selection
  useGroupInitializer(); // Initialize group selection
  useChatInitializer(); // Initialize chat selection (handles route check internally)

  return (
    <Suspense fallback={
    <div className="h-screen flex bg-[var(--groups1-background)] overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
            <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    }>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}


