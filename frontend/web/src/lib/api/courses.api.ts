import { http } from "./http";

export const coursesApi = {
  getCourses() {
    return http.request<
      Array<{
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
      }>
    >("/courses", {
      method: "GET",
    });
  },

  createCourse(data: { name: string; description?: string | null; isActive?: boolean }) {
    return http.request<{
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
    }>("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getCourseById(courseId: string) {
    return http.request<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      modules: Array<{
        id: string;
        name: string;
        description: string | null;
        orderIndex: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          progress: number;
        };
      }>;
      _count: {
        enrollments: number;
      };
    }>(`/courses/${courseId}`, {
      method: "GET",
    });
  },

  updateCourse(
    courseId: string,
    data: { name?: string; description?: string | null; isActive?: boolean }
  ) {
    return http.request<{
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
    }>(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteCourse(courseId: string) {
    return http.request<{
      message: string;
    }>(`/courses/${courseId}`, {
      method: "DELETE",
    });
  },

  listAllModules() {
    return http.request<
      Array<{
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
      }>
    >("/modules", { method: "GET" });
  },

  getCourseModules(courseId: string) {
    return http.request<
      Array<{
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
      }>
    >(`/courses/${courseId}/modules`, {
      method: "GET",
    });
  },

  createModule(data: {
    courseId: string;
    name: string;
    description?: string | null;
    orderIndex?: number;
    isActive?: boolean;
  }) {
    return http.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>("/modules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getModule(moduleId: string) {
    return http.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>(`/modules/${moduleId}`, {
      method: "GET",
    });
  },

  updateModule(
    moduleId: string,
    data: {
      name?: string;
      description?: string | null;
      orderIndex?: number;
      isActive?: boolean;
    }
  ) {
    return http.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>(`/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteModule(moduleId: string) {
    return http.request<{
      message: string;
    }>(`/modules/${moduleId}`, {
      method: "DELETE",
    });
  },
};
