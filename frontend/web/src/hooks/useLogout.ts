"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function useLogout() {
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);

  return useCallback(() => {
    clear();
    router.replace("/logout");
  }, [clear, router]);
}



