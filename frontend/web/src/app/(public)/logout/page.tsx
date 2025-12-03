"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function LogoutPage() {
  const router = useRouter();
  usePageTitle("Sign Out");
  useEffect(() => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } catch {}
    router.replace("/login");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-muted-foreground">Signing you out…</p>
    </div>
  );
}


