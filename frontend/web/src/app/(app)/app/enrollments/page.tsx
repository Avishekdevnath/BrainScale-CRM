"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { ExportColumnSelector } from "@/components/students/ExportColumnSelector";
import { StudentActionsMenu } from "@/components/students/StudentActionsMenu";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { StatusBadge } from "@/components/ui/status-badge";
import { useGroups } from "@/hooks/useGroups";
import { useCourses } from "@/hooks/useCourses";
import { useCourseModules } from "@/hooks/useCourseModules";
import { useStudents } from "@/hooks/useStudents";
import { useBatches } from "@/hooks/useBatches";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { saveStudentExportFromCSV, type StudentExportFormat } from "@/lib/student-export";
import type { Student, StudentEnrollment, StudentsListParams } from "@/types/students.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";

type EnrollmentRow = {
  id: string;
  student: Student;
  enrollment: StudentEnrollment;
};

const statusVariantMap: Record<string, "info" | "warning" | "success" | "error"> = {
  NEW: "info",
  IN_PROGRESS: "warning",
  FOLLOW_UP: "warning",
  CONVERTED: "success",
  LOST: "error",
};

const formatNumber = (value?: number) =>
  typeof value === "number" ? value.toLocaleString() : "-";

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

export default function EnrollmentsPage() {
  usePageTitle("Enrollments");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [groupId, setGroupId] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [status, setStatus] = useState<StudentsListParams["status"] | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportColumnSelectorOpen, setIsExportColumnSelectorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<StudentExportFormat>("csv");

  const { data: groups } = useGroups();
  const { data: courses } = useCourses();
  const {
    data: modules,
    isLoading: modulesLoading,
    error: modulesError,
  } = useCourseModules(courseId || undefined);

  const studentsParams: StudentsListParams = {
    q: debouncedSearchQuery || undefined,
    page,
    size: pageSize,
    groupId: groupId || undefined,
    batchId: batchId || undefined,
    courseId: courseId || undefined,
    moduleId: moduleId || undefined,
    status: status || undefined,
  };

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useStudents(studentsParams);

  const enrollmentRows = useMemo<EnrollmentRow[]>(() => {
    if (!data?.students?.length) return [];
    return data.students.flatMap((student) => {
      if (!student.enrollments || student.enrollments.length === 0) {
        return [];
      }
      return student.enrollments.map((enrollment) => ({
        id: enrollment.id,
        student,
        enrollment,
      }));
    });
  }, [data]);

  const totalEnrollments = useMemo(() => {
    if (!groups) return undefined;
    return groups.reduce((sum, group) => sum + (group._count?.enrollments ?? 0), 0);
  }, [groups]);

  const activeGroups = useMemo(() => {
    if (!groups) return undefined;
    return groups.filter((group) => group.isActive).length;
  }, [groups]);

  const coursesWithEnrollments = useMemo(() => {
    if (!courses) return undefined;
    return courses.filter((course) => (course._count?.enrollments ?? 0) > 0).length;
  }, [courses]);

  const topCourse = useMemo(() => {
    if (!courses || courses.length === 0) return undefined;
    return courses.reduce((max, course) =>
      (course._count?.enrollments ?? 0) > (max?._count?.enrollments ?? 0) ? course : max,
    undefined as (typeof courses)[number] | undefined);
  }, [courses]);

  const averagePerCourse = useMemo(() => {
    if (!courses || !courses.length || typeof totalEnrollments !== "number") return undefined;
    return totalEnrollments / courses.length;
  }, [courses, totalEnrollments]);

  const kpiCards = useMemo(() => {
    return [
      {
        key: "total",
        label: "Total Enrollments",
        value: formatNumber(totalEnrollments),
        hint: activeGroups !== undefined ? `${formatNumber(activeGroups)} active groups` : undefined,
      },
      {
        key: "courses",
        label: "Courses with Enrollments",
        value: formatNumber(coursesWithEnrollments),
        hint: courses ? `${formatNumber(courses.length)} total courses` : undefined,
      },
      {
        key: "average",
        label: "Avg / Course",
        value: averagePerCourse !== undefined ? formatNumber(Math.round(averagePerCourse)) : "-",
        hint: "Average enrollments per course",
      },
      {
        key: "top",
        label: "Top Course",
        value: topCourse?.name ?? "-",
        hint:
          topCourse && typeof topCourse._count?.enrollments === "number"
            ? `${formatNumber(topCourse._count.enrollments)} enrollments`
            : undefined,
      },
    ];
  }, [totalEnrollments, activeGroups, coursesWithEnrollments, courses, averagePerCourse, topCourse]);

  const handleImportSuccess = useCallback(() => {
    mutate();
  }, [mutate]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleExport = useCallback(
    async (columns: string[], format: StudentExportFormat) => {
      if (!columns || columns.length === 0) {
        toast.error("Please select at least one column to export");
        return;
      }
      setIsExporting(true);
      try {
        const blob = await apiClient.exportStudentsCSV({
          groupId: groupId || undefined,
          batchId: batchId || undefined,
          columns: columns.join(","),
        });
        const filenameBase = `enrollments-export-${new Date().toISOString().split("T")[0]}`;
        await saveStudentExportFromCSV(format, blob, columns, filenameBase);
        toast.success(`Enrollments exported as ${format.toUpperCase()}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to export enrollments";
        toast.error(message);
      } finally {
        setIsExporting(false);
      }
    },
    [groupId, batchId]
  );

  const handleExportConfirm = useCallback(
    (columns: string[]) => {
      void handleExport(columns, pendingExportFormat);
    },
    [handleExport, pendingExportFormat]
  );

  const handleExportClick = useCallback((format: StudentExportFormat) => {
    setPendingExportFormat(format);
    setIsExportColumnSelectorOpen(true);
  }, []);

  const handleStudentChanged = useCallback(() => {
    mutate();
  }, [mutate]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Enrollments</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Manage student enrollments</p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load enrollments"}
            </p>
            <Button
              onClick={() => mutate()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Enrollments</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            View and manage student-to-group/course placements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <ExportDropdown
            onSelect={handleExportClick}
            isExporting={isExporting}
            pendingFormat={pendingExportFormat}
            triggerLabel="Export"
            options={[
              { value: "csv", label: "Export CSV" },
              { value: "xlsx", label: "Export XLSX" },
            ]}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.key} variant="groups1" className="p-3 sm:p-4">
            <p className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--groups1-text)]">{card.value}</p>
            {card.hint && (
              <p className="mt-1 text-[11px] text-[var(--groups1-text-secondary)]">{card.hint}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <CollapsibleFilters open={showFilters} contentClassName="py-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <Input
                type="text"
                placeholder="Search student, group, or course..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Group
                </label>
                <select
                  value={groupId}
                  onChange={(event) => {
                    setGroupId(event.target.value);
                    setPage(1);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  )}
                >
                  <option value="">All Groups</option>
                  {groups?.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    setModuleId("");
                    setPage(1);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  )}
                >
                  <option value="">All Courses</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Module
                </label>
                <select
                  value={moduleId}
                  onChange={(event) => {
                    setModuleId(event.target.value);
                    setPage(1);
                  }}
                  disabled={!courseId}
                  className={cn(
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <option value="">All Modules</option>
                  {!courseId ? (
                    <option value="" disabled>
                      Select a course first
                    </option>
                  ) : modulesLoading ? (
                    <option value="" disabled>
                      Loading modules...
                    </option>
                  ) : modulesError ? (
                    <option value="" disabled>
                      Error loading modules
                    </option>
                  ) : modules?.length ? (
                    modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No modules available
                    </option>
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
                  Status
                </label>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as StudentsListParams["status"] | "");
                    setPage(1);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
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
      </CollapsibleFilters>

      {/* Enrollments Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {data ? <>Enrollments ({enrollmentRows.length})</> : "Enrollments"}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading enrollments...</p>
            </div>
          ) : enrollmentRows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No enrollments found</p>
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                Try adjusting filters or importing students into a group.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Group
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Status
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
                    {enrollmentRows.map((row) => {
                      const { student, enrollment } = row;
                      const statusVariant = statusVariantMap[enrollment.status ?? ""] ?? "info";
                      return (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            <div className="flex flex-col">
                              <Link
                                href={`/app/students/${student.id}`}
                                className="font-medium text-[var(--groups1-text)] hover:text-[var(--groups1-primary)] hover:underline"
                              >
                                {student.name}
                              </Link>
                              <span className="text-xs text-[var(--groups1-text-secondary)]">
                                {student.email ?? "No email"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            <div className="flex flex-col gap-1">
                              {enrollment.group ? (
                                <Link
                                  href={`/app/groups/${enrollment.group.id}/students`}
                                  className="text-[var(--groups1-primary)] hover:underline"
                                >
                                  {enrollment.group.name}
                                </Link>
                              ) : (
                                "-"
                              )}
                              {typeof enrollment.isActive === "boolean" && (
                                <StatusBadge
                                  size="sm"
                                  variant={enrollment.isActive ? "success" : "warning"}
                                  className="w-fit"
                                >
                                  {enrollment.isActive ? "Active" : "Inactive"}
                                </StatusBadge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {enrollment.course?.name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            <StatusBadge variant={statusVariant} size="sm">
                              {enrollment.status ?? "N/A"}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)] border-b border-[var(--groups1-card-border-inner)]">
                            {formatDate(student.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right border-b border-[var(--groups1-card-border-inner)]">
                            <StudentActionsMenu
                              student={student}
                              contextGroupId={enrollment.group?.id}
                              onChanged={handleStudentChanged}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data?.pagination?.totalPages && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} students)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
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

      <BulkImportModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} onSuccess={handleImportSuccess} />
      <ExportColumnSelector
        open={isExportColumnSelectorOpen}
        onOpenChange={setIsExportColumnSelectorOpen}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}

