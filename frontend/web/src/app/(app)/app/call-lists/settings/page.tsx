"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CallStatusOptionsManager } from "@/components/call-lists/CallStatusOptionsManager";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";

export default function CallListSettingsPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  usePageTitle("Call List Settings");

  useEffect(() => {
    if (isAdmin === false) router.replace("/app/call-lists");
  }, [isAdmin, router]);

  if (isAdmin === false) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
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

      <div>
        <h1 className="text-xl font-semibold text-[var(--groups1-text)]">Call List Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
          Manage call status options for your workspace
        </p>
      </div>

      <CallStatusOptionsManager />
    </div>
  );
}
