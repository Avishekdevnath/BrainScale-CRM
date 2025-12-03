"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { CourseDetail } from "./useCourses";

export function useCourse(courseId: string | null | undefined) {
  return useSWR<CourseDetail>(
    courseId ? `course-${courseId}` : null,
    async () => {
      if (!courseId) throw new Error("Course ID is required");
      const detail = await apiClient.getCourseById(courseId);
      return {
        ...detail,
        modules:
          detail.modules?.map((module) => ({
          ...module,
          courseId: courseId,
          })) ?? [],
        _count: {
          modules: detail.modules?.length ?? 0,
          enrollments: detail._count?.enrollments ?? 0,
        },
      };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

