"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useCourses, Course } from "@/hooks/useCourses";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type CourseStatus = "active" | "inactive";

// Helper function to format time ago from ISO timestamp
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

// Helper to convert API Course to UI Course format
function mapCourseToUI(course: Course): {
  id: string;
  name: string;
  description: string | null;
  status: CourseStatus;
  modules: number;
  enrollments: number;
  lastActivity: string;
} {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    status: course.isActive ? "active" : "inactive",
    modules: course._count.modules,
    enrollments: course._count.enrollments,
    lastActivity: formatTimeAgo(course.updatedAt),
  };
}

export default function CoursesPage() {
  const router = useRouter();
  const { data: courses, error: coursesError, isLoading: coursesLoading, mutate: mutateCourses } = useCourses();
  usePageTitle("Courses");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    status: "active" as CourseStatus 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate KPIs from courses data
  const uiCourses = courses ? courses.map(mapCourseToUI) : [];
  const totalCourses = uiCourses.length;
  const activeCourses = uiCourses.filter((c) => c.status === "active").length;
  const totalModules = uiCourses.reduce((sum, c) => sum + c.modules, 0);
  const totalEnrollments = uiCourses.reduce((sum, c) => sum + c.enrollments, 0);

  const courseKPIs = [
    {
      label: "Total Courses",
      value: totalCourses.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Active Courses",
      value: activeCourses.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Modules",
      value: totalModules.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Enrollments",
      value: totalEnrollments.toLocaleString(),
      trend: { value: "", type: "neutral" as const },
    },
  ];

  const handleCreate = () => {
    setEditingCourse(null);
    setFormData({ name: "", description: "", status: "active" });
    setIsDialogOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({ 
      name: course.name, 
      description: course.description || "", 
      status: course.isActive ? "active" : "inactive" 
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (course: Course) => {
    setDeletingCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCourse) {
        // Update existing course
        await apiClient.updateCourse(editingCourse.id, {
          name: formData.name,
          description: formData.description || null,
          isActive: formData.status === "active",
        });
        toast.success("Course updated successfully");
      } else {
        // Create new course
        await apiClient.createCourse({
          name: formData.name,
          description: formData.description || null,
          isActive: formData.status === "active",
        });
        toast.success("Course created successfully");
      }

      // Invalidate and refetch courses
      await mutateCourses();
      await mutate("courses");

      setIsDialogOpen(false);
      setEditingCourse(null);
      setFormData({ name: "", description: "", status: "active" });
    } catch (error: any) {
      const errorMessage = error?.message || (editingCourse ? "Failed to update course" : "Failed to create course");
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can perform this action");
      } else if (error?.status === 409) {
        toast.error("A course with this name already exists");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteCourse(deletingCourse.id);
      toast.success("Course deleted successfully");

      // Invalidate and refetch courses
      await mutateCourses();
      await mutate("courses");

      setIsDeleteDialogOpen(false);
      setDeletingCourse(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete course";
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can delete courses");
      } else if (error?.status === 404) {
        toast.error("Course not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewCourse = (course: Course) => {
    router.push(`/app/courses/${course.id}`);
  };

  // Loading state
  if (coursesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
              Courses
            </h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Manage and organize your courses
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (coursesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
              Courses
            </h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Manage and organize your courses
            </p>
          </div>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {coursesError instanceof Error ? coursesError.message : "Failed to load courses"}
            </p>
            <Button
              onClick={() => mutateCourses()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Courses
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage and organize your courses
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {courseKPIs.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Courses Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>All Courses</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {uiCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[var(--groups1-text-secondary)] mx-auto mb-4" />
              <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
                No courses found. Create your first course to get started.
              </p>
              <Button
                onClick={handleCreate}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Course Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Modules
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Enrollments
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Last Activity
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses?.map((course) => {
                    const uiCourse = mapCourseToUI(course);
                    return (
                      <tr
                        key={course.id}
                        className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors cursor-pointer"
                        onClick={() => handleViewCourse(course)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--groups1-text)]">
                            {uiCourse.name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-[var(--groups1-text-secondary)] max-w-md truncate">
                            {uiCourse.description || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                          {uiCourse.modules}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                          {uiCourse.enrollments}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            variant={uiCourse.status === "active" ? "success" : "info"}
                            size="sm"
                          >
                            {uiCourse.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                          {uiCourse.lastActivity}
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEdit(course)}
                              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(course)}
                              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-error)]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogClose onClose={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Course" : "Create New Course"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Course Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter course name"
                disabled={isSubmitting}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter course description (optional)"
                disabled={isSubmitting}
                rows={4}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as CourseStatus })
                }
                disabled={isSubmitting}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || isSubmitting}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingCourse ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingCourse ? "Update" : "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={() => setIsDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Are you sure you want to delete <strong>{deletingCourse?.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-[var(--groups1-error)] text-white hover:bg-[var(--groups1-error)]/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
