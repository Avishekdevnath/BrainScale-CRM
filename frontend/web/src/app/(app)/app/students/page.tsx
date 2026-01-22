"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { ExportColumnSelector } from "@/components/students/ExportColumnSelector";
import { StudentActionsMenu } from "@/components/students/StudentActionsMenu";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStudents } from "@/hooks/useStudents";
import { useGroups } from "@/hooks/useGroups";
import { useCourses } from "@/hooks/useCourses";
import { useCourseModules } from "@/hooks/useCourseModules";
import { useKPIs } from "@/hooks/useDashboard";
import { useBatches } from "@/hooks/useBatches";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { saveStudentExportFromCSV, type StudentExportFormat } from "@/lib/student-export";
import { toast } from "sonner";
import { Search, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { StudentsBulkActionsToolbar } from "@/components/students/StudentsBulkActionsToolbar";
import { cn } from "@/lib/utils";
import type { StudentsListParams } from "@/types/students.types";

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--groups1-text-secondary)]">Loading students…</div>}>
      <StudentsPageContent />
    </Suspense>
  );
}

function StudentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  usePageTitle("Students");
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [groupId, setGroupId] = useState<string>(searchParams.get("groupId") || "");
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [courseId, setCourseId] = useState<string>(searchParams.get("courseId") || "");
  const [moduleId, setModuleId] = useState<string>(searchParams.get("moduleId") || "");
  const [status, setStatus] = useState<StudentsListParams["status"] | "">(() => {
    const statusParam = searchParams.get("status");
    if (!statusParam) return "";
    const validStatuses: StudentsListParams["status"][] = ["NEW", "IN_PROGRESS", "FOLLOW_UP", "CONVERTED", "LOST"];
    return validStatuses.includes(statusParam as StudentsListParams["status"]) ? (statusParam as StudentsListParams["status"]) : "";
  });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize] = useState(20);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<StudentExportFormat>("csv");
  const [isExportColumnSelectorOpen, setIsExportColumnSelectorOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const { data: groups } = useGroups();
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: modules, isLoading: modulesLoading, error: modulesError } = useCourseModules(courseId || null);
  const kpiFilters = useMemo(() => (groupId ? { groupId } : undefined), [groupId]);
  const { data: kpis, error: kpiError, isLoading: kpisLoading } = useKPIs(kpiFilters);

  const params: StudentsListParams = useMemo(
    () => ({
      q: debouncedSearchQuery || undefined,
      page,
      size: pageSize,
      groupId: groupId || undefined,
      batchId: batchId || undefined,
      courseId: courseId || undefined,
      moduleId: moduleId || undefined,
      status: status || undefined,
    }),
    [debouncedSearchQuery, page, pageSize, groupId, batchId, courseId, moduleId, status]
  );

  const { data, error, isLoading, mutate } = useStudents(params);

  const formatNumber = (value?: number) => (typeof value === "number" ? value.toLocaleString() : "-");
  const formatPercent = (value?: number) => (typeof value === "number" ? `${value.toFixed(1)}%` : "-");

  const kpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        key: "students",
        label: "Total Students",
        value: formatNumber(kpis.overview.totalStudents),
        hint: `${formatNumber(kpis.overview.totalGroups)} groups · ${formatNumber(kpis.overview.totalCourses)} courses`,
      },
      {
        key: "calls",
        label: "Calls Today",
        value: formatNumber(kpis.activity.callsToday),
        hint: `${formatNumber(kpis.activity.callsThisWeek)} this week`,
      },
      {
        key: "followups",
        label: "Pending Follow-ups",
        value: formatNumber(kpis.followups.pending),
        hint: `${formatNumber(kpis.followups.overdue)} overdue`,
      },
      {
        key: "conversion",
        label: "Conversion Rate",
        value: formatPercent(kpis.metrics.conversionRate),
        hint: `${formatNumber(kpis.metrics.averageCallsPerDay)} avg calls/day`,
      },
    ];
  }, [kpis]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
    if (groupId) params.set("groupId", groupId);
    if (batchId) params.set("batchId", batchId);
    if (courseId) params.set("courseId", courseId);
    if (moduleId) params.set("moduleId", moduleId);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const newUrl = queryString ? `/app/students?${queryString}` : "/app/students";
    
    // Use replace to avoid adding to history on every filter change
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchQuery, groupId, batchId, courseId, moduleId, status, page, router]);

  const handleExport = useCallback(
    async (columns: string[], format: StudentExportFormat, studentIds?: string[]) => {
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
          studentIds: studentIds && studentIds.length > 0 ? studentIds.join(",") : undefined,
        });
        const filenameBase = `students-export-${new Date().toISOString().split("T")[0]}`;
        await saveStudentExportFromCSV(format, blob, columns, filenameBase);
        toast.success(`Students exported as ${format.toUpperCase()}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to export students";
        toast.error(errorMessage);
      } finally {
        setIsExporting(false);
      }
    },
    [groupId, batchId]
  );

  const handleExportClick = useCallback((format: StudentExportFormat) => {
    setPendingExportFormat(format);
    setExportScope("all");
    setIsExportColumnSelectorOpen(true);
  }, []);

  const handleExportSelectedClick = useCallback(() => {
    if (selectedStudentIds.size === 0) {
      toast.info("Select students to export");
      return;
    }
    setPendingExportFormat("csv");
    setExportScope("selected");
    setIsExportColumnSelectorOpen(true);
  }, [selectedStudentIds]);

  const handleExportConfirm = useCallback(
    (columns: string[]) => {
      if (exportScope === "selected") {
        void handleExport(columns, pendingExportFormat, Array.from(selectedStudentIds));
        return;
      }
      void handleExport(columns, pendingExportFormat);
    },
    [handleExport, pendingExportFormat, exportScope, selectedStudentIds]
  );

  const handleImportSuccess = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleStudentChanged = useCallback(() => {
    mutate();
  }, [mutate]);

  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [page, debouncedSearchQuery, groupId, batchId, courseId, moduleId, status]);

  const pageStudentIds = useMemo(() => data?.students.map((student) => student.id) ?? [], [data?.students]);

  const isAllSelectedOnPage = useMemo(() => {
    if (pageStudentIds.length === 0) return false;
    return pageStudentIds.every((id) => selectedStudentIds.has(id));
  }, [pageStudentIds, selectedStudentIds]);

  const handleToggleSelectAllOnPage = useCallback(() => {
    if (pageStudentIds.length === 0) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageStudentIds.every((id) => next.has(id));
      if (allSelected) {
        pageStudentIds.forEach((id) => next.delete(id));
      } else {
        pageStudentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [pageStudentIds]);

  const handleToggleSelectStudent = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }, []);

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
            Manage and view all students in your workspace
          </p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load students"}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Students</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage and view all students in your workspace
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
          />
        </div>
      </div>

      {(kpiCards.length > 0 || kpisLoading) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <Card key={card.key} variant="groups1" className="p-2 sm:p-2.5">
              <p className="text-[10px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide leading-tight">
                {card.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--groups1-text)] leading-tight">{card.value}</p>
              {card.hint && <p className="mt-0.5 text-[10px] text-[var(--groups1-text-secondary)] leading-tight">{card.hint}</p>}
            </Card>
          ))}
          {kpisLoading && !kpiCards.length &&
            Array.from({ length: 4 }).map((_, idx) => (
              <Card key={`kpi-skeleton-${idx}`} variant="groups1" className="p-2.5">
                <div className="h-2 w-20 rounded bg-[var(--groups1-border)] animate-pulse" />
                <div className="mt-2 h-4 w-28 rounded bg-[var(--groups1-border)] animate-pulse" />
              </Card>
            ))}
        </div>
      )}
      {kpiError && (
        <p className="text-xs text-red-600">
          Unable to load live KPIs right now. Showing cached data only.
        </p>
      )}

      {/* Search and Filters */}
      <CollapsibleFilters open={showFilters} contentClassName="py-4">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <Input
                type="text"
                placeholder="Search students by name, email, phone, Discord ID, tags, groups, batches, or status..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Group
                </label>
                <select
                  value={groupId}
                  onChange={(e) => {
                    setGroupId(e.target.value);
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

              <div className="flex flex-col gap-2">
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

              <div className="flex flex-col gap-2">
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
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
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

              <div className="flex flex-col gap-2">
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
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
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
                  <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">
                    Select a course to filter by module
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as StudentsListParams["status"] | "");
                    setPage(1);
                  }}
                  disabled={!groupId}
                  className={cn(
                    "w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
                {!groupId && (
                  <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">
                    Select a group to filter by status
                  </p>
                )}
              </div>
            </div>
          </div>
      </CollapsibleFilters>

      <StudentsBulkActionsToolbar
        selectedStudentIds={Array.from(selectedStudentIds)}
        onChanged={handleStudentChanged}
        onClearSelection={() => setSelectedStudentIds(new Set())}
        onRequestExportSelected={handleExportSelectedClick}
      />

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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)] w-[44px]">
                        <input
                          type="checkbox"
                          aria-label="Select all students on this page"
                          className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                          checked={isAllSelectedOnPage}
                          onChange={handleToggleSelectAllOnPage}
                        />
                      </th>
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
                        Groups
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Batches
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
                      const hasEnrollments = (student.enrollments?.length ?? 0) > 0;
                      const groupNames =
                        student.enrollments
                          ?.map((enrollment) => enrollment.group?.name)
                          .filter((name): name is string => Boolean(name)) ?? [];
                      const batchNames =
                        student.studentBatches
                          ?.map((sb) => sb.batch?.name)
                          .filter((name): name is string => Boolean(name)) ?? [];
                      const primaryStatus = student.enrollments?.find((enrollment) => enrollment?.status)?.status ?? null;
                      const isSelected = selectedStudentIds.has(student.id);
                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)] align-top">
                            <input
                              type="checkbox"
                              aria-label={`Select ${student.name}`}
                              className="h-4 w-4 cursor-pointer accent-[var(--groups1-primary)]"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudent(student.id)}
                            />
                          </td>
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
                        {hasEnrollments ? (
                          <div className="space-y-1">
                            {student.enrollments?.map((enrollment) => (
                              <div key={enrollment.id} className="flex items-center gap-2">
                                <span>{enrollment.group?.name ?? "-"}</span>
                                {typeof enrollment.isActive === "boolean" && (
                                  <StatusBadge
                                    variant={enrollment.isActive ? "success" : "warning"}
                                    size="sm"
                                  >
                                    {enrollment.isActive ? "Active" : "Inactive"}
                                  </StatusBadge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <StatusBadge variant="warning" size="sm">
                            Not enrolled
                          </StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                        {batchNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.studentBatches?.map((sb) => (
                              <Link
                                key={sb.id}
                                href={`/app/batches/${sb.batchId}`}
                                className="px-2 py-0.5 text-xs rounded-md bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-primary)] hover:text-[var(--groups1-btn-primary-text)] transition-colors"
                              >
                                {sb.batch?.name || "Unknown"}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--groups1-text-secondary)]">—</span>
                        )}
                      </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                            {hasEnrollments ? (
                              primaryStatus || "-"
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
                            <StudentActionsMenu student={student} onChanged={handleStudentChanged} />
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

      {/* Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleImportSuccess}
      />
      {/* Export Column Selector */}
      <ExportColumnSelector
        open={isExportColumnSelectorOpen}
        onOpenChange={setIsExportColumnSelectorOpen}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
