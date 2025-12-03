"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Module } from "./useCourses";

export function useCourseModules(courseId: string | null | undefined) {
  return useSWR<Module[]>(
    courseId ? `course-modules-${courseId}` : null,
    async () => {
      if (!courseId) throw new Error("Course ID is required");
      return apiClient.getCourseModules(courseId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

