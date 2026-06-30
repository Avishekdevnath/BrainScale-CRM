"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeature } from "@/hooks/usePlatformFeatures";
import type { PlatformFeature } from "@/lib/platform-features";

interface FeatureGuardProps {
  feature: PlatformFeature;
  children: React.ReactNode;
  redirectTo?: string;
}

export function FeatureGuard({ feature, children, redirectTo = "/app" }: FeatureGuardProps) {
  const router = useRouter();
  const { enabled, isLoading } = useFeature(feature);

  useEffect(() => {
    if (!isLoading && !enabled) {
      router.replace(redirectTo);
    }
  }, [enabled, isLoading, router, redirectTo]);

  if (isLoading || !enabled) return null;

  return <>{children}</>;
}
