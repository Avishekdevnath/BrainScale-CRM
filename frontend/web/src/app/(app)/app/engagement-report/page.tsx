"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { FilterStrip } from "@/components/dashboard/FilterStrip";
import { CallsTrendChart } from "@/components/dashboard/CallsTrendChart";
import { useDashboardSummary, useCallsTrend } from "@/hooks/useDashboard";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import type { WorkspaceMember } from "@/types/members.types";
import { useGroupStore } from "@/store/group";
import { useWorkspaceStore } from "@/store/workspace";
import { useFeature } from "@/hooks/usePlatformFeatures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardFilters, AssigneePerformanceItem } from "@/types/dashboard.types";

function KPISkeleton() {
  return (
    <div className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded mb-3" />
      <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded mb-2" />
      <div className="h-3 w-20 bg-[var(--groups1-secondary)] rounded" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-[var(--groups1-secondary)] rounded" />
      ))}
    </div>
  );
}

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "bg-[var(--color-bg-2)] text-[var(--groups1-warning)]";
  if (rank === 2) return "bg-[var(--color-bg-1)] text-[var(--groups1-info)]";
  if (rank === 3) return "bg-[var(--color-bg-6)] text-[var(--groups1-warning)]";
  return "bg-[var(--groups1-secondary)] text-[var(--groups1-text)]";
}

export default function EngagementReportPage() {
  usePageTitle("Engagement Report");
  const { current: currentGroup } = useGroupStore();
  const workspaceId = useWorkspaceStore((state) => state.current?.id ?? null);
  const groupsFeature = useFeature("groups");
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "month",
    groupId: currentGroup?.id,
  });
  const [trendPeriod, setTrendPeriod] = useState<"day" | "week" | "month" | "year">("month");

  const { data: summary, isLoading, error, mutate } = useDashboardSummary(filters);
  const { data: callsTrend, isLoading: trendLoading, error: trendError, mutate: trendMutate } = useCallsTrend(trendPeriod);
  const { members } = useWorkspaceMembers(workspaceId);

  const callers = useMemo(
    () => members.map((m: WorkspaceMember) => ({ id: m.id, name: m.user.name ?? m.user.email ?? "Unknown" })),
    [members]
  );

  const groups = useMemo(
    () =>
      (summary?.distributions.studentsByGroup ?? []).map((g) => ({
        id: g.groupId,
        name: g.groupName,
      })),
    [summary]
  );

  const kpis = summary?.kpis;
  const totalCalls = kpis?.overview?.totalCalls ?? 0;
  const connectedCalls = kpis?.metrics?.connectedCalls ?? 0;
  const connectedPercent = kpis?.metrics?.connectedPercent ?? 0;
  const conversionRate = kpis?.metrics?.conversionRate ?? 0;
  const pendingFollowups = kpis?.followups?.pending ?? 0;
  const overdueFollowups = kpis?.followups?.overdue ?? 0;
  const callsToday = kpis?.activity?.callsToday ?? 0;
  const callsThisWeek = kpis?.activity?.callsThisWeek ?? 0;

  const callsByStatus = summary?.distributions?.callsByStatus ?? [];
  const followupsByStatus = summary?.distributions?.followupsByStatus ?? [];
  const assigneePerformance: AssigneePerformanceItem[] = summary?.assigneePerformance ?? [];
  const callLists = summary?.callLists ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--groups1-text)]">Engagement Report</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">Calls, follow-ups, and caller performance</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { mutate(); trendMutate(); }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <FilterStrip
        filters={filters}
        onFiltersChange={setFilters}
        groups={groups}
        callers={callers}
        showGroups={groupsFeature.enabled}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <KPISkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Total Calls" value={totalCalls.toLocaleString()} />
            <KPICard label="Connected" value={connectedCalls.toLocaleString()} breakdown={`${connectedPercent.toFixed(1)}%`} />
            <KPICard label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} />
            <KPICard label="Today" value={callsToday.toLocaleString()} />
            <KPICard
              label="Pending Follow-ups"
              value={pendingFollowups.toLocaleString()}
              trend={pendingFollowups > 0 ? { value: "Action needed", type: "negative" } : undefined}
            />
            <KPICard
              label="Overdue"
              value={overdueFollowups.toLocaleString()}
              trend={overdueFollowups > 0 ? { value: "Overdue", type: "negative" } : undefined}
            />
          </>
        )}
      </div>

      {/* Trend + Caller Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calls Trend */}
        <Card className="border-[var(--groups1-card-border)] shadow-sm">
          <CardHeader className="pt-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[var(--groups1-text)]">Calls Trend</CardTitle>
            <div className="flex gap-1">
              {(["day", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={cn(
                    "px-2 py-1 text-xs rounded font-medium transition-colors",
                    trendPeriod === p
                      ? "bg-[var(--groups1-primary)] text-white"
                      : "text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)]"
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <CallsTrendChart
              data={callsTrend}
              isLoading={trendLoading}
              error={trendError as Error | null}
              onRetry={() => trendMutate()}
            />
          </CardContent>
        </Card>

        {/* Caller Performance */}
        <Card className="border-[var(--groups1-card-border)] shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--groups1-text)]">Caller Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : assigneePerformance.length === 0 ? (
              <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-8">No caller data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["#", "Caller", "Total Calls", "Connected", "Rate %"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide border-b border-[var(--groups1-card-border-inner)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assigneePerformance.map((a) => {
                      const rate = a.totalCalls > 0 ? ((a.connectedCalls / a.totalCalls) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={a.assigneeId} className="hover:bg-[var(--groups1-secondary)] transition-colors">
                          <td className="px-3 py-2.5 border-b border-[var(--groups1-card-border-inner)]">
                            <span className={cn("inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-full text-xs font-bold", getRankBadgeClass(a.rank))}>
                              {a.rank}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)] max-w-[180px] truncate" title={a.assignee}>{a.assignee}</td>
                          <td className="px-3 py-2.5 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">{a.totalCalls}</td>
                          <td className="px-3 py-2.5 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">{a.connectedCalls}</td>
                          <td className="px-3 py-2.5 text-sm font-semibold border-b border-[var(--groups1-card-border-inner)]">
                            <span className={cn(parseFloat(rate) >= 50 ? "text-[var(--groups1-success)]" : "text-[var(--groups1-warning)]")}>
                              {rate}%
                            </span>
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
      </div>

      {/* Call Status + Follow-up Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-[var(--groups1-card-border)] shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--groups1-text)]">Call Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={4} />
            ) : callsByStatus.length === 0 ? (
              <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-6">No data</p>
            ) : (
              <div className="space-y-2">
                {callsByStatus.map((item) => {
                  const total = callsByStatus.reduce((s, c) => s + c.count, 0);
                  const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <span
                        className="text-sm text-[var(--groups1-text-secondary)] w-28 shrink-0 truncate capitalize"
                        title={item.status.toLowerCase().replace("_", " ")}
                      >
                        {item.status.toLowerCase().replace("_", " ")}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--groups1-secondary)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--groups1-primary)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--groups1-text)] w-12 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--groups1-card-border)] shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--groups1-text)]">Follow-up Health</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={3} />
            ) : followupsByStatus.length === 0 ? (
              <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-6">No follow-up data</p>
            ) : (
              <div className="space-y-2">
                {followupsByStatus.map((item) => {
                  const total = followupsByStatus.reduce((s, c) => s + c.count, 0);
                  const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
                  const isOverdue = item.status.toLowerCase().includes("overdue");
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <span
                        className="text-sm text-[var(--groups1-text-secondary)] w-28 shrink-0 truncate capitalize"
                        title={item.status.toLowerCase().replace("_", " ")}
                      >
                        {item.status.toLowerCase().replace("_", " ")}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--groups1-secondary)] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", isOverdue ? "bg-[var(--groups1-error)]" : "bg-[var(--groups1-primary)]")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--groups1-text)] w-12 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Call Lists */}
      {callLists.length > 0 && (
        <Card className="border-[var(--groups1-card-border)] shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[var(--groups1-text)]">Active Call Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Name", "Group", "Students", "Source", "Created"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide border-b border-[var(--groups1-card-border-inner)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {callLists.map((list) => (
                    <tr key={list.id} className="hover:bg-[var(--groups1-secondary)] transition-colors">
                      <td className="px-3 py-2.5 text-sm font-medium text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)] max-w-[220px] truncate" title={list.name}>{list.name}</td>
                      <td className="px-3 py-2.5 text-sm text-[var(--groups1-text-secondary)] border-b border-[var(--groups1-card-border-inner)] max-w-[160px] truncate" title={list.group?.name ?? undefined}>{list.group?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">{list.itemCount}</td>
                      <td className="px-3 py-2.5 text-sm text-[var(--groups1-text-secondary)] border-b border-[var(--groups1-card-border-inner)] capitalize">{list.source.toLowerCase()}</td>
                      <td className="px-3 py-2.5 text-sm text-[var(--groups1-text-secondary)] border-b border-[var(--groups1-card-border-inner)]">
                        {new Date(list.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-[var(--groups1-error)] bg-[var(--groups1-error)]/10 p-4 text-sm text-[var(--groups1-error)]">
          Failed to load report data.{" "}
          <button onClick={() => mutate()} className="underline font-medium">Retry</button>
        </div>
      )}
    </div>
  );
}
