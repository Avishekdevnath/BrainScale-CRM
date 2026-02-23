"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";

export interface Module {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  courseId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
    progress: number;
  };
  course?: {
    id: string;
    name: string;
  };
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    modules: number;
    enrollments: number;
  };
}

export interface CourseDetail extends Course {
  modules: Module[];
}

export function useCourses() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  return useSWR<Course[]>(
    workspaceId && accessToken ? `${workspaceId}:courses` : null,
    async () => apiClient.getCourses(),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

