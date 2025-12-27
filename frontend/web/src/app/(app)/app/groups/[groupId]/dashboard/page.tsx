"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { CallListsSection } from "@/components/dashboard/CallListsSection";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw, AlertCircle, Phone, PhoneCall } from "lucide-react";
import { GroupCallListCreator } from "@/components/call-lists/GroupCallListCreator";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useGroup } from "@/hooks/useGroup";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { useCallList } from "@/hooks/useCallLists";
import { apiClient } from "@/lib/api-client";
import { mapKPIsToCards, mapRecentActivity } from "@/lib/dashboard-mappers";
import type { DashboardFilters } from "@/types/dashboard.types";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loader2 } from "lucide-react";

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

export default function GroupDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.groupId as string;
  const { isLoading: isInitializing } = useGroupInitializer();
  const { data: group, error: groupError, isLoading: groupLoading } = useGroup(groupId);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "month",
    groupId: groupId,
  });
  const [isCallListCreatorOpen, setIsCallListCreatorOpen] = useState(false);
  const [editingCallListId, setEditingCallListId] = useState<string | null>(null);

  const groupName = group?.name || `Group ${groupId}`;
  usePageTitle(group ? `${groupName} - Dashboard` : "Group Dashboard");

  // Fetch dashboard data with group filter
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: isDashboardLoading,
    mutate: refetchDashboard,
  } = useDashboardSummary(filters);

  // Update filters when groupId changes
  useMemo(() => {
    setFilters((prev) => ({ ...prev, groupId: groupId }));
  }, [groupId]);

  // Transform KPI data
  const kpiCards = useMemo(() => {
    if (!dashboardData?.kpis && !group) return [];
    
    // If we have dashboard KPIs, use them
    if (dashboardData?.kpis) {
      return mapKPIsToCards(dashboardData.kpis);
    }
    
    // Otherwise, create KPIs from group data
    if (group) {
      return [
        {
          label: "Total Students",
          value: group._count.enrollments.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Total Calls",
          value: group._count.calls.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Follow-ups",
          value: group._count.followups.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Call Lists",
          value: (group._count.callLists || 0).toString(),
          trend: { value: "", type: "neutral" as const },
        },
      ];
    }
    
    return [];
  }, [dashboardData, group]);

  // Transform activity data
  const activities = useMemo(() => {
    if (!dashboardData?.recentActivity) return [];
    // Filter activities by group if needed
    return mapRecentActivity(dashboardData.recentActivity);
  }, [dashboardData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchDashboard();
    toast.success("Dashboard refreshed");
  }, [refetchDashboard]);

  // Extract call lists from dashboard data, filtered by group
  const callLists = useMemo(() => {
    const allCallLists = dashboardData?.callLists || [];
    return allCallLists.filter((list) => list.groupId === groupId);
  }, [dashboardData, groupId]);

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

  // Loading state
  if (isInitializing || groupLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName}
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {isInitializing ? "Initializing group..." : "Loading dashboard..."}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (groupError || dashboardError) {
    const error = groupError || dashboardError;
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    const isNotFound = (error as any)?.status === 404;
    const isForbidden = (error as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Group Dashboard
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Group Not Found" : isForbidden ? "Access Denied" : "Error Loading Dashboard"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this group."
                : errorMessage}
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

  if (!group) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName}
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Group dashboard and overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isDashboardLoading}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            <RefreshCw
              className={cn("w-4 h-4", isDashboardLoading && "animate-spin")}
            />
          </Button>
          <Button
            onClick={() => router.push(`/app/groups/${groupId}/students`)}
            variant="outline"
            size="sm"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <Button
            onClick={() => router.push("/app/calls")}
            variant="outline"
            size="sm"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            <Phone className="w-4 h-4 mr-2" />
            Log Call
          </Button>
          <Button
            onClick={() => setIsCallListCreatorOpen(true)}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <PhoneCall className="w-4 h-4 mr-2" />
            Create Call List
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <CallListsSection
        callLists={callLists}
        onCreateNew={() => setIsCallListCreatorOpen(true)}
        onEdit={handleCallListEdit}
        onDelete={handleCallListDelete}
        isAdmin={true}
        groupId={groupId}
      />

      {/* Activity and Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activity Feed */}
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
              <div className="text-center py-8">
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  No recent activity
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
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
      </div>

      {/* Follow-ups Chart */}
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

      {/* Call List Creator/Editor Dialog */}
      {groupId && (
        <GroupCallListCreator
          open={isCallListCreatorOpen && !editingCallListId}
          onOpenChange={(open) => {
            if (!open) {
              setIsCallListCreatorOpen(false);
              setEditingCallListId(null);
              // Refresh dashboard when dialog closes (in case a call list was created)
              refetchDashboard();
            } else {
              setIsCallListCreatorOpen(open);
            }
          }}
          groupId={groupId}
        />
      )}

      {/* Call List Form Dialog for Editing */}
      {editingCallListId && editingCallList && (
        <CallListFormDialog
          callList={editingCallList}
          open={!!editingCallListId}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCallListId(null);
              setIsCallListCreatorOpen(false);
            }
          }}
          onSuccess={handleCallListFormSuccess}
        />
      )}
    </div>
  );
}

