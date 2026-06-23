"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Settings2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { CallStatusOptionsManager } from "@/components/call-lists/CallStatusOptionsManager";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";

export default function CallListSettingsPage() {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.getCurrentId());
  const { isLoading: isLoadingMember } = useCurrentMember(workspaceId);
  const isAdmin = useIsAdmin();
  usePageTitle("Call List Settings");

  // Only redirect once the member has actually loaded and is confirmed non-admin.
  // useIsAdmin() returns false while the member is loading/revalidating, so guarding
  // on isLoadingMember prevents bouncing the user out mid-session (e.g. after a save).
  const denied = !isLoadingMember && !isAdmin;

  useEffect(() => {
    if (denied) router.replace("/app/call-lists");
  }, [denied, router]);

  if (denied) return null;

  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-4 md:space-y-6 pb-24 md:pb-0">
      <div className="flex items-center gap-3 px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/app/call-lists")}
          className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Call Lists
        </Button>
      </div>

      <div className="flex items-start gap-3 px-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] flex-shrink-0">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--groups1-text)]">Call List Settings</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
            Manage call status options for your workspace
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/40 p-5">
        <CallStatusOptionsManager />
      </div>
    </div>
  );
}
