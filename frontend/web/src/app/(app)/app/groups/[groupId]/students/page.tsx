"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { ExportColumnSelector } from "@/components/students/ExportColumnSelector";
import { StudentActionsMenu } from "@/components/students/StudentActionsMenu";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStudents } from "@/hooks/useStudents";
import { useCourses } from "@/hooks/useCourses";
import { useCourseModules } from "@/hooks/useCourseModules";
import { useGroup } from "@/hooks/useGroup";
import { useBatches } from "@/hooks/useBatches";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { saveStudentExportFromCSV, type StudentExportFormat } from "@/lib/student-export";
import { toast } from "sonner";
import { Search, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentsListParams } from "@/types/students.types";

export default function GroupStudentsPage() {
  const routeParams = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = routeParams?.groupId as string;
  usePageTitle("Group Students");
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [courseId, setCourseId] = useState<string>(searchParams.get("courseId") || "");
  const [moduleId, setModuleId] = useState<string>(searchParams.get("moduleId") || "");
  const [status, setStatus] = useState<StudentsListParams["status"] | "">(
    (searchParams.get("status") as StudentsListParams["status"]) || ""
  );
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize] = useState(20);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<StudentExportFormat>("csv");
  const [isExportColumnSelectorOpen, setIsExportColumnSelectorOpen] = useState(false);

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: modules, isLoading: modulesLoading, error: modulesError } = useCourseModules(courseId || null);
  const { data: group } = useGroup(groupId);

  const queryParams: StudentsListParams = useMemo(
    () => ({
      q: debouncedSearchQuery || undefined,
      page,
      size: pageSize,
      groupId: groupId, // Always use groupId from URL
      batchId: batchId || undefined,
      courseId: courseId || undefined,
      moduleId: moduleId || undefined,
      status: status || undefined,
    }),
    [debouncedSearchQuery, page, pageSize, groupId, batchId, courseId, moduleId, status]
  );

  const { data, error, isLoading, mutate } = useStudents(queryParams);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
    if (batchId) params.set("batchId", batchId);
    if (courseId) params.set("courseId", courseId);
    if (moduleId) params.set("moduleId", moduleId);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const newUrl = queryString 
      ? `/app/groups/${groupId}/students?${queryString}` 
      : `/app/groups/${groupId}/students`;
    
    // Use replace to avoid adding to history on every filter change
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchQuery, batchId, courseId, moduleId, status, page, groupId, router]);

  const handleExport = useCallback(
    async (columns: string[], format: StudentExportFormat) => {
      if (!columns || columns.length === 0) {
        toast.error("Please select at least one column to export");
        return;
      }
      setIsExporting(true);
      try {
        const blob = await apiClient.exportStudentsCSV({
          groupId,
          batchId: batchId || undefined,
          columns: columns.join(","),
        });
        const filenameBase = `group-${groupId}-students-${new Date().toISOString().split("T")[0]}`;
        await saveStudentExportFromCSV(format, blob, columns, filenameBase);
        toast.success(`Students exported as ${format.toUpperCase()}`);
      } catch (error: unknown) {
        let errorMessage = "Failed to export students";
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("network") || msg.includes("fetch")) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (msg.includes("unauthorized") || msg.includes("401")) {
            errorMessage = "Your session has expired. Please refresh the page.";
          } else if (msg.includes("forbidden") || msg.includes("403")) {
            errorMessage = "You don't have permission to export students.";
          } else if (msg.length < 100) {
            errorMessage = error.message;
          }
        }
        toast.error(errorMessage);
      } finally {
        setIsExporting(false);
      }
    },
    [groupId, batchId]
  );

  const handleExportClick = useCallback((format: StudentExportFormat) => {
    setPendingExportFormat(format);
    setIsExportColumnSelectorOpen(true);
  }, []);

  const handleExportConfirm = useCallback(
    (columns: string[]) => {
      void handleExport(columns, pendingExportFormat);
    },
    [handleExport, pendingExportFormat]
  );

  const handleImportSuccess = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleStudentChanged = useCallback(() => {
    mutate();
  }, [mutate]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Students</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage students in this group
          </p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load students"}
            </p>
            <Button
              onClick={() => mutate()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Students</h1>
            {group?.batch && (
              <Link href={`/app/batches/${group.batch.id}`}>
                <StatusBadge variant="info" size="sm" className="cursor-pointer hover:opacity-80">
                  {group.batch.name}
                </StatusBadge>
              </Link>
            )}
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage students in this group
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Students
          </Button>
          <ExportDropdown
            onSelect={handleExportClick}
            isExporting={isExporting}
            pendingFormat={pendingExportFormat}
            triggerLabel="Export"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <Card variant="groups1">
        <CardContent variant="groups1" className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                aria-label="Search students"
              />
              {searchQuery !== debouncedSearchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--groups1-text-secondary)]" />
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Batch
                </label>
                <BatchFilter
                  value={batchId}
                  onChange={(value) => {
                    setBatchId(value);
                    setPage(1);
                  }}
                  placeholder="All Batches"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setModuleId(""); // Reset module when course changes
                    setPage(1);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  )}
                >
                  <option value="">All Courses</option>
                  {coursesLoading ? (
                    <option value="" disabled>Loading courses...</option>
                  ) : coursesError ? (
                    <option value="" disabled>Error loading courses</option>
                  ) : courses && courses.length > 0 ? (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No courses available</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Module
                </label>
                <select
                  value={moduleId}
                  onChange={(e) => {
                    setModuleId(e.target.value);
                    setPage(1);
                  }}
                  disabled={!courseId}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <option value="">All Modules</option>
                  {!courseId ? (
                    <option value="" disabled>Select a course first</option>
                  ) : modulesLoading ? (
                    <option value="" disabled>Loading modules...</option>
                  ) : modulesError ? (
                    <option value="" disabled>Error loading modules</option>
                  ) : modules && modules.length > 0 ? (
                    modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No modules available</option>
                  )}
                </select>
                {!courseId && (
                  <p className="text-xs text-[var(--groups1-text-secondary)]">
                    Select a course to filter by module
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as StudentsListParams["status"] | "");
                    setPage(1);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  )}
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {data ? (
              <>
                Students ({data.pagination.total})
              </>
            ) : (
              "Students"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading students...</p>
            </div>
          ) : !data || data.students.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No students found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Discord ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Tags
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => {
                      const primaryPhone = student.phones.find((p) => p.isPrimary) || student.phones[0];
                      const hasEnrollmentForGroup =
                        student.enrollments?.some((enrollment) => enrollment.group?.id === groupId) ?? false;
                      const enrollmentForGroup = student.enrollments?.find(
                        (enrollment) => enrollment.group?.id === groupId
                      );
                      const statusForGroup = enrollmentForGroup?.status ?? null;
                      const isActiveForGroup = enrollmentForGroup?.isActive;
                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            <Link
                              href={`/app/students/${student.id}`}
                              className="font-medium text-[var(--groups1-text)] hover:text-[var(--groups1-primary)] hover:underline"
                            >
                              {student.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {student.email || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {student.discordId || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {primaryPhone?.phone || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {hasEnrollmentForGroup ? (
                              <div className="flex flex-wrap gap-2">
                                {typeof isActiveForGroup === "boolean" && (
                                  <StatusBadge
                                    variant={isActiveForGroup ? "success" : "warning"}
                                    size="sm"
                                  >
                                    {isActiveForGroup ? "Active" : "Inactive"}
                                  </StatusBadge>
                                )}
                                {statusForGroup && (
                                  <StatusBadge variant="info" size="sm">
                                    {statusForGroup}
                                  </StatusBadge>
                                )}
                              </div>
                            ) : (
                              <StatusBadge variant="warning" size="sm">
                                Not enrolled
                              </StatusBadge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {student.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {student.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)] border-b border-[var(--groups1-card-border-inner)]">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-[var(--groups1-card-border-inner)]">
                            <StudentActionsMenu
                              student={student}
                              onChanged={handleStudentChanged}
                              contextGroupId={groupId}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        groupId={groupId}
        onSuccess={handleImportSuccess}
      />
      <ExportColumnSelector
        open={isExportColumnSelectorOpen}
        onOpenChange={setIsExportColumnSelectorOpen}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}

