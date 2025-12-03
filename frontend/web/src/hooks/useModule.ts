"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Module } from "./useCourses";

export function useModule(moduleId: string | null | undefined) {
  return useSWR<Module>(
    moduleId ? `module-${moduleId}` : null,
    async () => {
      if (!moduleId) throw new Error("Module ID is required");
      return apiClient.getModule(moduleId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

