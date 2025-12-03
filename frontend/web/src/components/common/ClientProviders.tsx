"use client";

import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import React from "react";
import { defaultSWRConfig } from "@/lib/swr-config";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={defaultSWRConfig}>
      {children}
      <Toaster richColors position="top-right" />
    </SWRConfig>
  );
}


