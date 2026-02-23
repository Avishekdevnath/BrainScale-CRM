"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";

export default function LogoutPage() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clear);
  usePageTitle("Sign Out");

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout endpoint to clear the httpOnly cookie on backend
        await apiClient.logout();
      } catch (err) {
        // Even if API call fails, clear local state
        console.error("Logout API error:", err);
      }

      // Clear Zustand store
      clearAuth();

      // Redirect to login
      router.replace("/login");
    };

    performLogout();
  }, [router, clearAuth]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-muted-foreground">Signing you out…</p>
    </div>
  );
}


