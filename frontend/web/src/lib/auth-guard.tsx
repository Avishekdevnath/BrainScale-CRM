"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If we have a valid non-expired token, we're ready immediately
      if (accessToken && !isTokenExpired(accessToken)) {
        setReady(true);
        return;
      }

      // No token in memory - try silent refresh using httpOnly cookie
      try {
        await apiClient.refreshAccessToken();
        setReady(true);
      } catch (err: unknown) {
        // Silent refresh failed - redirect to login
        console.error("[AuthGuard] Silent refresh failed:", err);
        router.replace("/login");
      }
    };

    checkAuth();
  }, [accessToken, router]);

  if (!ready) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  return <>{children}</>;
}


