"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterStrip } from "@/components/dashboard/FilterStrip";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { FollowUpList } from "@/components/dashboard/FollowUpList";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { CallListsSection } from "@/components/dashboard/CallListsSection";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, RefreshCw, AlertCircle, Phone, Filter } from "lucide-react";
import { WorkspaceCallListCreator } from "@/components/call-lists/WorkspaceCallListCreator";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { useDashboardSummary, useStudentsByGroup } from "@/hooks/useDashboard";
import { useCallList } from "@/hooks/useCallLists";
import { apiClient } from "@/lib/api-client";
import { useBatches } from "@/hooks/useBatches";
import { mapKPIsToCards, mapRecentActivity } from "@/lib/dashboard-mappers";
import type { DashboardFilters } from "@/types/dashboard.types";
import { useGroupStore } from "@/store/group";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import Link from "next/link";

// Skeleton loader for KPI cards
function KPISkeleton() {
  return (
    <div className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded mb-3" />
      <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded mb-2" />
      <div className="h-3 w-20 bg-[var(--groups1-secondary)] rounded" />
    </div>
  );
}

// Skeleton loader for activity list
function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-[var(--groups1-secondary)]" />
          <div className="flex-1">
            <div className="h-4 w-48 bg-[var(--groups1-secondary)] rounded mb-2" />
            <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Placeholder leaderboard data (backend doesn't provide this)
const placeholderLeaderboard = [
  { rank: 1, assignee: "A. Khan", conversions: 32 },
  { rank: 2, assignee: "S. Rahman", conversions: 28 },
  { rank: 3, assignee: "I. Bari", conversions: 25 },
  { rank: 4, assignee: "P. Chowdhury", conversions: 21 },
  { rank: 5, assignee: "J. Alam", conversions: 19 },
];

export default function WorkspaceDashboardPage() {
  const router = useRouter();
  const { current: currentGroup } = useGroupStore();
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "month",
    groupId: currentGroup?.id,
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["NEW"]);
  const [isCallListCreatorOpen, setIsCallListCreatorOpen] = useState(false);
  const [editingCallListId, setEditingCallListId] = useState<string | null>(null);
  const [deletingCallListId, setDeletingCallListId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  usePageTitle("Dashboard");

  // Fetch dashboard data
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: isDashboardLoading,
    mutate: refetchDashboard,
  } = useDashboardSummary(filters);

  // Fetch groups for filter dropdown
  const { data: groupsData } = useStudentsByGroup();

  // Fetch batches for filter dropdown
  const { data: batchesData } = useBatches({ isActive: true });

  // Transform groups data for FilterStrip
  const groups = useMemo(() => {
    if (!groupsData) return [];
    return groupsData.map((item) => ({
      id: item.groupId,
      name: item.groupName,
    }));
  }, [groupsData]);

  // Transform batches data for FilterStrip
  const batches = useMemo(() => {
    if (!batchesData?.batches) return [];
    return batchesData.batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
    }));
  }, [batchesData]);

  // Transform KPI data
  const kpiCards = useMemo(() => {
    if (!dashboardData?.kpis) return [];
    return mapKPIsToCards(dashboardData.kpis);
  }, [dashboardData]);

  // Transform activity data
  const activities = useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    return mapRecentActivity(dashboardData.recentActivity);
  }, [dashboardData]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle status toggle (for now, just update local state - not used in API)
  const handleStatusToggle = useCallback((status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  // Handle export (placeholder)
  const handleExport = useCallback(() => {
    toast.info("Export functionality coming soon");
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchDashboard();
    toast.success("Dashboard refreshed");
  }, [refetchDashboard]);

  // Extract call lists from dashboard data
  const callLists = useMemo(() => {
    return dashboardData?.callLists || [];
  }, [dashboardData]);

  // Fetch call list for editing
  const { data: editingCallList } = useCallList(editingCallListId);

  // Handle call list edit
  const handleCallListEdit = useCallback((callListId: string) => {
    setEditingCallListId(callListId);
    setIsCallListCreatorOpen(false);
  }, []);

  // Handle call list delete
  const handleCallListDelete = useCallback(async (callListId: string) => {
    if (!confirm("Are you sure you want to delete this call list? This action cannot be undone.")) {
      return;
    }
    try {
      await apiClient.deleteCallList(callListId);
      toast.success("Call list deleted successfully");
      refetchDashboard();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete call list";
      toast.error(errorMessage);
    }
  }, [refetchDashboard]);

  // Handle call list form success
  const handleCallListFormSuccess = useCallback(() => {
    setEditingCallListId(null);
    setIsCallListCreatorOpen(false);
    refetchDashboard();
  }, [refetchDashboard]);

  // Error handling
  if (dashboardError) {
    const errorMessage =
      dashboardError instanceof Error
        ? dashboardError.message
        : "Failed to load dashboard data";
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Dashboard</h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Overview of your workspace
            </p>
          </div>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              Error Loading Dashboard
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {errorMessage}
            </p>
            <Button
              onClick={handleRefresh}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-4 md:space-y-6 pb-24 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--groups1-text)]">Dashboard</h1>
            <span className="text-xs md:text-sm font-medium text-[var(--groups1-text-secondary)] bg-[var(--groups1-secondary)] px-2 py-1 rounded-md">
              {filters.period ?? "month"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-[var(--groups1-text-secondary)]">
            Overview of your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile: icon actions */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isDashboardLoading}
            className="h-10 w-10 p-0 md:h-auto md:w-auto md:px-3 md:py-2 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={cn("w-4 h-4", isDashboardLoading && "animate-spin")} />
            <span className="hidden md:inline ml-2">Refresh</span>
          </Button>
          <Button
            onClick={() => setShowMobileFilters((v) => !v)}
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 md:hidden bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setIsCallListCreatorOpen(true)}
            className="h-10 px-3 md:h-auto md:px-4 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            aria-label="Create call list"
          >
            <Phone className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Create Call List</span>
          </Button>
          <Button
            onClick={() => router.push("/app/group-management")}
            className="h-10 px-3 md:h-auto md:px-4 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            aria-label="Groups"
          >
            <Users className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Groups</span>
          </Button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className={cn("md:block", showMobileFilters ? "block" : "hidden md:block")}>
        <FilterStrip
          filters={filters}
          onFiltersChange={handleFiltersChange}
          groups={groups}
          batches={batches}
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
          onExport={handleExport}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {isDashboardLoading ? (
          <>
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
          </>
        ) : (
          kpiCards.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
            />
          ))
        )}
      </div>

      {/* Call Lists Section */}
      {/* Mobile: compact call list cards */}
      <div className="md:hidden">
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Call Lists</CardTitle>
              <Button
                onClick={() => setIsCallListCreatorOpen(true)}
                size="sm"
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                <Phone className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </CardHeader>
          <CardContent variant="groups1" className="pb-6">
            {callLists.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--groups1-text-secondary)]">
                No call lists yet
              </div>
            ) : (
              <div className="space-y-3">
                {callLists.map((list) => {
                  const detailUrl = `/app/call-lists/${list.id}`;
                  const subtitle = list.group
                    ? `${list.group.name}${list.group.batch ? ` • ${list.group.batch.name}` : ""}`
                    : "Workspace-wide";
                  return (
                    <div
                      key={list.id}
                      className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={detailUrl}
                            className="text-base font-semibold text-[var(--groups1-text)] hover:underline truncate block"
                          >
                            {list.name}
                          </Link>
                          <div className="mt-1 text-xs text-[var(--groups1-text-secondary)] truncate">
                            {subtitle}
                          </div>
                        </div>
                        <span className="text-[10px] bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] px-2 py-1 rounded-md font-semibold uppercase tracking-wide">
                          {String(list.source).toLowerCase()}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-[var(--groups1-border)]">
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] flex flex-col">
                            <span className="text-[var(--groups1-text-secondary)] uppercase font-semibold">
                              Students
                            </span>
                            <span className="text-[var(--groups1-text)] font-bold">{list.itemCount}</span>
                          </div>
                          <div className="text-[10px] flex flex-col">
                            <span className="text-[var(--groups1-text-secondary)] uppercase font-semibold">
                              Created
                            </span>
                            <span className="text-[var(--groups1-text)] font-bold">
                              {new Date(list.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline" className="h-8 px-3">
                          <Link href={detailUrl}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desktop: existing call lists section */}
      <div className="hidden md:block">
        <CallListsSection
          callLists={callLists}
          onCreateNew={() => setIsCallListCreatorOpen(true)}
          onEdit={handleCallListEdit}
          onDelete={handleCallListDelete}
          isAdmin={true}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Calls Over Time</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            {isDashboardLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-sm text-[var(--groups1-text-secondary)] animate-pulse">
                  Loading chart...
                </div>
              </div>
            ) : dashboardData?.trends?.callsTrend?.length ? (
              <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                Chart placeholder (data ready)
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Follow-ups Over Time</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
              Chart placeholder
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            {isDashboardLoading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="text-sm text-[var(--groups1-text-secondary)] animate-pulse">
                  Loading chart...
                </div>
              </div>
            ) : dashboardData?.distributions?.callsByStatus?.length ? (
              <div className="h-52 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                Chart placeholder (data ready)
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Assignee Performance</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <LeaderboardTable entries={placeholderLeaderboard} />
          </CardContent>
        </Card>
      </div>

      {/* Widgets & CTA Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Upcoming Follow-ups */}
          <Card variant="groups1">
            <CardHeader variant="groups1">
              <CardTitle>Upcoming Follow-ups</CardTitle>
            </CardHeader>
            <CardContent variant="groups1">
              {isDashboardLoading ? (
                <ActivitySkeleton />
              ) : activities.filter((a) => a.type === "status_update").length > 0 ? (
                <div className="text-sm text-[var(--groups1-text-secondary)] text-center py-8">
                  Follow-ups will be displayed here when available
                </div>
              ) : (
                <div className="text-sm text-[var(--groups1-text-secondary)] text-center py-8">
                  No follow-ups scheduled
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="groups1">
            <CardHeader variant="groups1">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent variant="groups1">
              {isDashboardLoading ? (
                <ActivitySkeleton />
              ) : activities.length > 0 ? (
                <ActivityList activities={activities} />
              ) : (
                <div className="text-sm text-[var(--groups1-text-secondary)] text-center py-8">
                  No activities yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Density Heatmap */}
          <Card variant="groups1">
            <CardHeader variant="groups1">
              <CardTitle>Call Density Heatmap</CardTitle>
            </CardHeader>
            <CardContent variant="groups1">
              <div className="h-48 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                Heatmap placeholder
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              Invite teammates
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4 leading-relaxed">
              Collaborate with your team to track students and manage follow-ups more effectively.
            </p>
            <Button className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
              Send invite
            </Button>
          </CardContent>
        </Card>
      </div>

      <WorkspaceCallListCreator
        open={isCallListCreatorOpen && !editingCallListId}
        onOpenChange={(open) => {
          setIsCallListCreatorOpen(open);
          if (!open) setEditingCallListId(null);
        }}
        initialFilters={{
          batchId: filters.batchId || null,
          groupId: filters.groupId || null,
        }}
      />

      <CallListFormDialog
        open={!!editingCallListId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCallListId(null);
          }
        }}
        callList={editingCallList || undefined}
        onSuccess={handleCallListFormSuccess}
      />
    </div>
  );
}
