"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If we have an accessToken in memory, we're ready
      if (accessToken) {
        setReady(true);
        return;
      }

      // No token in memory - try silent refresh using httpOnly cookie
      try {
        await apiClient.refreshAccessToken();
        setReady(true);
      } catch (err) {
        // Silent refresh failed - redirect to login
        router.replace("/login");
      }
    };

    checkAuth();
  }, [accessToken, router]);

  if (!ready) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  return <>{children}</>;
}


