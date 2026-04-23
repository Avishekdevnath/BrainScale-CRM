"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";

export interface ModuleWithCourse {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  courseId: string;
  createdAt: string;
  updatedAt: string;
  course: { id: string; name: string };
  _count: { enrollments: number; progress: number };
}

export function useAllModules() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  return useSWR<ModuleWithCourse[]>(
    workspaceId ? `${workspaceId}:all-modules` : null,
    () => apiClient.listAllModules(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  );
}
