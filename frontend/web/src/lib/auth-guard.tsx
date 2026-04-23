"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return true;
    return Date.now() >= payload.exp * 1000 - 5_000;
  } catch {
    return true;
  }
}

/**
 * Gates the authed app tree. Responsibilities:
 *  1. On mount: if no usable token, try silent refresh (via httpOnly cookie).
 *  2. Reactive: if `accessToken` in the store becomes null at any point
 *     (api-client clears it when refresh fails), redirect to /login.
 *
 * This is the single source of truth for "auth lost" → "go to login".
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (accessToken && !isTokenExpired(accessToken)) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        await apiClient.refreshAccessToken();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [accessToken, router]);

  // Reactive: if auth is cleared after we were ready, leave the app.
  useEffect(() => {
    if (ready && !accessToken) {
      router.replace("/login");
    }
  }, [ready, accessToken, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
