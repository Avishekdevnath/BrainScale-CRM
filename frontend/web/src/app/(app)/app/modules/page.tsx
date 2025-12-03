"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAllModules, ModuleWithCourse } from "@/hooks/useAllModules";
import { useCourses } from "@/hooks/useCourses";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Search, Loader2, Pencil, Trash2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption =
  | "course-asc"
  | "course-desc"
  | "order-asc"
  | "order-desc"
  | "enrollments-desc"
  | "enrollments-asc"
  | "progress-desc"
  | "progress-asc"
  | "name-asc"
  | "name-desc";

export default function ModulesPage() {
  const router = useRouter();
  const { data: allModules, error: modulesError, isLoading: modulesLoading } = useAllModules();
  const { data: courses } = useCourses();
  usePageTitle("Modules");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortOption, setSortOption] = useState<SortOption>("course-asc");

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithCourse | null>(null);
  const [deletingModule, setDeletingModule] = useState<ModuleWithCourse | null>(null);
  const [moduleFormData, setModuleFormData] = useState({
    name: "",
    description: "",
    orderIndex: 0,
    status: "active" as "active" | "inactive",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort modules
  const filteredAndSortedModules = useMemo(() => {
    if (!allModules) return [];

    let filtered = [...allModules];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (module) =>
          module.name.toLowerCase().includes(query) ||
          (module.description && module.description.toLowerCase().includes(query))
      );
    }

    // Apply course filter
    if (selectedCourse !== "all") {
      filtered = filtered.filter((module) => module.course.id === selectedCourse);
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(
        (module) => module.isActive === (selectedStatus === "active")
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "course-asc":
          return a.course.name.localeCompare(b.course.name) || a.orderIndex - b.orderIndex;
        case "course-desc":
          return b.course.name.localeCompare(a.course.name) || a.orderIndex - b.orderIndex;
        case "order-asc":
          return a.orderIndex - b.orderIndex;
        case "order-desc":
          return b.orderIndex - a.orderIndex;
        case "enrollments-desc":
          return b._count.enrollments - a._count.enrollments;
        case "enrollments-asc":
          return a._count.enrollments - b._count.enrollments;
        case "progress-desc":
          return b._count.progress - a._count.progress;
        case "progress-asc":
          return a._count.progress - b._count.progress;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return a.course.name.localeCompare(b.course.name) || a.orderIndex - b.orderIndex;
      }
    });

    return filtered;
  }, [allModules, searchQuery, selectedCourse, selectedStatus, sortOption]);

  // Calculate KPIs
  const totalModules = allModules?.length || 0;
  const activeModules = allModules?.filter((m) => m.isActive).length || 0;
  const totalEnrollments = allModules?.reduce((sum, m) => sum + m._count.enrollments, 0) || 0;
  const totalProgress = allModules?.reduce((sum, m) => sum + m._count.progress, 0) || 0;

  const moduleKPIs = [
    {
      label: "Total Modules",
      value: totalModules.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Active Modules",
      value: activeModules.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Enrollments",
      value: totalEnrollments.toLocaleString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Progress",
      value: totalProgress.toLocaleString(),
      trend: { value: "", type: "neutral" as const },
    },
  ];

  const handleEdit = (module: ModuleWithCourse) => {
    setEditingModule(module);
    setModuleFormData({
      name: module.name,
      description: module.description || "",
      orderIndex: module.orderIndex,
      status: module.isActive ? "active" : "inactive",
    });
    setIsModuleDialogOpen(true);
  };

  const handleDelete = (module: ModuleWithCourse) => {
    setDeletingModule(module);
    setIsDeleteModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleFormData.name.trim() || !editingModule) return;

    setIsSubmitting(true);
    try {
      await apiClient.updateModule(editingModule.id, {
        name: moduleFormData.name,
        description: moduleFormData.description || null,
        orderIndex: moduleFormData.orderIndex,
        isActive: moduleFormData.status === "active",
      });
      toast.success("Module updated successfully");

      // Invalidate and refetch
      await mutate(`all-modules-${courses?.map((c) => c.id).join(",")}`);
      await mutate(`course-${editingModule.course.id}`);
      await mutate(`course-modules-${editingModule.course.id}`);
      await mutate("courses");

      setIsModuleDialogOpen(false);
      setEditingModule(null);
      setModuleFormData({ name: "", description: "", orderIndex: 0, status: "active" });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update module";

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

      // Invalidate and refetch
      await mutate(`all-modules-${courses?.map((c) => c.id).join(",")}`);
      await mutate(`course-${deletingModule.course.id}`);
      await mutate(`course-modules-${deletingModule.course.id}`);
      await mutate("courses");

      setIsDeleteModuleDialogOpen(false);
      setDeletingModule(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete module";

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

  const handleNavigateToCourse = (courseId: string) => {
    router.push(`/app/courses/${courseId}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCourse("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = searchQuery || selectedCourse !== "all" || selectedStatus !== "all";

  // Loading state
  if (modulesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Modules</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage course modules and learning materials
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (modulesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Modules</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage course modules and learning materials
          </p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {modulesError instanceof Error ? modulesError.message : "Failed to load modules"}
            </p>
            <Button
              onClick={() => window.location.reload()}
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Modules</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Manage course modules and learning materials
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {moduleKPIs.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} />
        ))}
      </div>

      {/* Search and Filters */}
      <Card variant="groups1">
        <CardContent variant="groups1" className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <Input
                type="text"
                placeholder="Search modules by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]"
              />
            </div>

            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "min-w-[180px]"
              )}
            >
              <option value="all">All Courses</option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as "all" | "active" | "inactive")}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "min-w-[140px]"
              )}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "min-w-[180px]"
              )}
            >
              <option value="course-asc">Course (A-Z)</option>
              <option value="course-desc">Course (Z-A)</option>
              <option value="order-asc">Order (Low to High)</option>
              <option value="order-desc">Order (High to Low)</option>
              <option value="enrollments-desc">Enrollments (High to Low)</option>
              <option value="enrollments-asc">Enrollments (Low to High)</option>
              <option value="progress-desc">Progress (High to Low)</option>
              <option value="progress-asc">Progress (Low to High)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modules Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            All Modules {filteredAndSortedModules.length !== totalModules && `(${filteredAndSortedModules.length} of ${totalModules})`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {filteredAndSortedModules.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-[var(--groups1-text-secondary)] mx-auto mb-4" />
              <p className="text-sm text-[var(--groups1-text-secondary)] mb-2">
                {hasActiveFilters
                  ? "No modules match your filters"
                  : "No modules found. Create courses and add modules to get started."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-4 border-[var(--groups1-border)] text-[var(--groups1-text)]"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)]">
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Module Name
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Course
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Order
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Status
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Enrollments
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Progress
                    </th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedModules.map((module) => (
                    <tr
                      key={module.id}
                      className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--groups1-text)] cursor-pointer hover:text-[var(--groups1-primary)]"
                          onClick={() => handleNavigateToCourse(module.course.id)}
                        >
                          {module.name}
                        </div>
                        {module.description && (
                          <div className="text-xs text-[var(--groups1-text-secondary)] mt-1 max-w-md truncate">
                            {module.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleNavigateToCourse(module.course.id)}
                          className="text-sm text-[var(--groups1-primary)] hover:underline"
                        >
                          {module.course.name}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[var(--groups1-text-secondary)]">
                          #{module.orderIndex}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          variant={module.isActive ? "success" : "info"}
                          size="sm"
                        >
                          {module.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                        {module._count.enrollments}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                        {module._count.progress}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(module)}
                            className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(module)}
                            className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-error)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Edit Dialog */}
      <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
        <DialogContent className="w-[25vw] max-w-[500px] min-w-[400px]">
          <DialogClose onClose={() => setIsModuleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
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
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <Dialog open={isDeleteModuleDialogOpen} onOpenChange={setIsDeleteModuleDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setIsDeleteModuleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Are you sure you want to delete <strong>{deletingModule?.name}</strong> from{" "}
              <strong>{deletingModule?.course.name}</strong>? This action cannot be undone.
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
