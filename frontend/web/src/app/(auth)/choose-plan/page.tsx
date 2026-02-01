"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ChoosePlanPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  usePageTitle("Choose Plan");

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (!accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const workspaces = await apiClient.getWorkspaces();
        if (workspaces && workspaces.length > 0) {
          router.replace("/app");
          return;
        }
      } catch (error) {
        console.error("Workspace check failed:", error);
      }

      // Pricing / billing is disabled for now: always start with Starter.
      router.replace("/create-workspace");
    };

    checkAuthAndRedirect();
  }, [accessToken, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
    </div>
  );
}
