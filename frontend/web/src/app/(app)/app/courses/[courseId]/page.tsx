"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useCourse } from "@/hooks/useCourse";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Module } from "@/hooks/useCourses";
import { Loader2, AlertCircle, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  const { data: course, error: courseError, isLoading: courseLoading, mutate: mutateCourse } = useCourse(courseId);
  usePageTitle(course ? `${course.name} - Course Details` : "Course Details");

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState<Module | null>(null);
  const [moduleFormData, setModuleFormData] = useState({
    name: "",
    description: "",
    orderIndex: 0,
    status: "active" as "active" | "inactive",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate KPIs from course data
  const courseKPIs = course
    ? [
        {
          label: "Total Modules",
          value: course.modules.length.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Total Enrollments",
          value: course._count.enrollments.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Active Modules",
          value: course.modules.filter((m) => m.isActive).length.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Total Progress",
          value: course.modules.reduce((sum, m) => sum + m._count.progress, 0).toString(),
          trend: { value: "", type: "neutral" as const },
        },
      ]
    : [];

  // Sort modules by orderIndex
  const sortedModules = course?.modules ? [...course.modules].sort((a, b) => a.orderIndex - b.orderIndex) : [];

  const handleCreateModule = () => {
    setEditingModule(null);
    const nextOrderIndex = sortedModules.length > 0 
      ? Math.max(...sortedModules.map(m => m.orderIndex)) + 1 
      : 1;
    setModuleFormData({
      name: "",
      description: "",
      orderIndex: nextOrderIndex,
      status: "active",
    });
    setIsModuleDialogOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleFormData({
      name: module.name,
      description: module.description || "",
      orderIndex: module.orderIndex,
      status: module.isActive ? "active" : "inactive",
    });
    setIsModuleDialogOpen(true);
  };

  const handleDeleteModule = (module: Module) => {
    setDeletingModule(module);
    setIsDeleteModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleFormData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingModule) {
        // Update existing module
        await apiClient.updateModule(editingModule.id, {
          name: moduleFormData.name,
          description: moduleFormData.description || null,
          orderIndex: moduleFormData.orderIndex,
          isActive: moduleFormData.status === "active",
        });
        toast.success("Module updated successfully");
      } else {
        // Create new module
        await apiClient.createModule({
          courseId: courseId,
          name: moduleFormData.name,
          description: moduleFormData.description || null,
          orderIndex: moduleFormData.orderIndex,
          isActive: moduleFormData.status === "active",
        });
        toast.success("Module created successfully");
      }

      // Invalidate and refetch course data
      await mutateCourse();
      await mutate(`course-${courseId}`);
      await mutate(`course-modules-${courseId}`);
      await mutate("courses");

      setIsModuleDialogOpen(false);
      setEditingModule(null);
      setModuleFormData({ name: "", description: "", orderIndex: 0, status: "active" });
    } catch (error: any) {
      const errorMessage = error?.message || (editingModule ? "Failed to update module" : "Failed to create module");
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can perform this action");
      } else if (error?.status === 409) {
        toast.error("A module with this name already exists in this course");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteModule = async () => {
    if (!deletingModule) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteModule(deletingModule.id);
      toast.success("Module deleted successfully");

      // Invalidate and refetch course data
      await mutateCourse();
      await mutate(`course-${courseId}`);
      await mutate(`course-modules-${courseId}`);
      await mutate("courses");

      setIsDeleteModuleDialogOpen(false);
      setDeletingModule(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete module";
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can delete modules");
      } else if (error?.status === 404) {
        toast.error("Module not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (courseLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Loading course...
          </h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (courseError) {
    const errorMessage =
      courseError instanceof Error ? courseError.message : "Failed to load course";
    const isNotFound = (courseError as any)?.status === 404;
    const isForbidden = (courseError as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Course Details
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Course Not Found" : isForbidden ? "Access Denied" : "Error Loading Course"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The course you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this course."
                : errorMessage}
            </p>
            <Button
              onClick={() => router.push("/app/courses")}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/app/courses")}
            className="mb-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {course.name}
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {course.description || "No description"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            variant={course.isActive ? "success" : "info"}
            size="sm"
          >
            {course.isActive ? "Active" : "Inactive"}
          </StatusBadge>
          <Button
            onClick={handleCreateModule}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Module
          </Button>
        </div>
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

      {/* Modules List */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {sortedModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
                No modules found. Add your first module to get started.
              </p>
              <Button
                onClick={handleCreateModule}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedModules.map((module) => (
                <div
                  key={module.id}
                  className="p-4 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] hover:bg-[var(--groups1-secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-medium text-[var(--groups1-text-secondary)] bg-[var(--groups1-secondary)] px-2 py-1 rounded">
                          #{module.orderIndex}
                        </span>
                        <h3 className="text-base font-semibold text-[var(--groups1-text)]">
                          {module.name}
                        </h3>
                        <StatusBadge
                          variant={module.isActive ? "success" : "info"}
                          size="sm"
                        >
                          {module.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                      {module.description && (
                        <p className="text-sm text-[var(--groups1-text-secondary)] mb-3">
                          {module.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--groups1-text-secondary)]">
                        <span>Enrollments: {module._count.enrollments}</span>
                        <span>Progress: {module._count.progress}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEditModule(module)}
                        className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteModule(module)}
                        className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-error)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Create/Edit Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogClose onClose={() => setIsModuleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Module" : "Create New Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Module Name
              </label>
              <input
                type="text"
                value={moduleFormData.name}
                onChange={(e) => setModuleFormData({ ...moduleFormData, name: e.target.value })}
                placeholder="Enter module name"
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
                value={moduleFormData.description}
                onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                placeholder="Enter module description (optional)"
                disabled={isSubmitting}
                rows={3}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                  Order Index
                </label>
                <input
                  type="number"
                  min="0"
                  value={moduleFormData.orderIndex}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, orderIndex: parseInt(e.target.value) || 0 })}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                />
                <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Lower numbers appear first
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                  Status
                </label>
                <select
                  value={moduleFormData.status}
                  onChange={(e) =>
                    setModuleFormData({ ...moduleFormData, status: e.target.value as "active" | "inactive" })
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModuleDialogOpen(false)}
                disabled={isSubmitting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveModule}
                disabled={!moduleFormData.name.trim() || isSubmitting}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingModule ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingModule ? "Update" : "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <Dialog open={isDeleteModuleDialogOpen} onOpenChange={setIsDeleteModuleDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={() => setIsDeleteModuleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Are you sure you want to delete <strong>{deletingModule?.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModuleDialogOpen(false)}
                disabled={isDeleting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeleteModule}
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

