"use client";

import useSWR from "swr";
import { useCourses } from "./useCourses";
import { apiClient } from "@/lib/api-client";
import { Module } from "./useCourses";

export interface ModuleWithCourse extends Module {
  course: {
    id: string;
    name: string;
  };
}

export function useAllModules() {
  const coursesResult = useCourses();
  const courses = coursesResult.data;
  const coursesError = coursesResult.error;
  const coursesLoading = coursesResult.isLoading ?? (!courses && !coursesError);

  // Fetch all course details in parallel to get modules
  const courseIds = courses?.map((c) => c.id) || [];
  const courseKeys = courseIds.length > 0 ? courseIds.map((id) => `course-${id}`) : null;

  const { data: allModulesData, error: modulesError, isLoading: modulesLoading } = useSWR<
    ModuleWithCourse[]
  >(
    courseKeys ? `all-modules-${courseIds.join(",")}` : null,
    async () => {
      if (!courses || courses.length === 0) return [];

      // Fetch all course details in parallel
      const courseDetailsPromises = courses.map((course) =>
        apiClient.getCourseById(course.id).catch((err) => {
          console.error(`Failed to fetch course ${course.id}:`, err);
          return null;
        })
      );

      const courseDetails = await Promise.all(courseDetailsPromises);

      // Combine all modules with course context
      const allModules: ModuleWithCourse[] = [];

      courseDetails.forEach((courseDetail, index) => {
        if (courseDetail && courseDetail.modules) {
          const course = courses[index];
          courseDetail.modules.forEach((module) => {
            allModules.push({
              ...module,
              courseId: course.id,
              course: {
                id: course.id,
                name: course.name,
              },
            });
          });
        }
      });

      return allModules;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    data: allModulesData || [],
    error: coursesError || modulesError,
    isLoading: coursesLoading || (modulesLoading ?? (!allModulesData && !modulesError)),
  };
}

