"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks, useTaskKpi } from "@/hooks/useTasks";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { TasksTable } from "@/components/tasks/TasksTable";
import { OverdueBanner } from "@/components/tasks/OverdueBanner";
import { CreateTaskDialog } from "@/components/tasks/TaskDialogs";
import { MOCK_TASKS, MOCK_KPI } from "@/components/tasks/mockTasks";
import type { Task } from "@/types/tasks.types";

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
  };
  return (
    <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-card)] p-5 shadow-sm">
      <p className="text-sm text-[var(--groups1-text-secondary)]">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color] ?? ""}`}>{value}</p>
    </div>
  );
}

export default function TasksDashboardPage() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);
  const { members } = useWorkspaceMembers(workspaceId ?? null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: recentData, isLoading, mutate } = useTasks(
    currentMember
      ? { sortBy: "updatedAt", sortOrder: "desc", size: 10 }
      : {}
  );
  const { data: kpi } = useTaskKpi();

  const hasRealKpi = !!kpi;
  const displayKpi = kpi ?? MOCK_KPI;
  const overdue = displayKpi.overdue;
  const recentTasks: Task[] = recentData?.data?.length ? recentData.data : MOCK_TASKS;
  const isPreview = !recentData?.data?.length;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Tasks</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">Overview of your task activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="text-[var(--groups1-text-secondary)]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Assign Task
          </Button>
        </div>
      </div>

      {/* Overdue Banner */}
      <OverdueBanner count={overdue} />

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${!hasRealKpi ? "opacity-50" : ""}`}>
        <KpiCard label="Active" value={displayKpi.totalActive} color="blue" />
        <KpiCard label="Completed" value={displayKpi.completed} color="green" />
        <KpiCard label="Overdue" value={displayKpi.overdue} color="red" />
        <KpiCard label="Due Today" value={displayKpi.dueToday} color="orange" />
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-[var(--groups1-text)]">Recent Activity</h2>
          {isPreview && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]">
              Preview
            </span>
          )}
        </div>
        <div className={`rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-card)] shadow-sm overflow-hidden ${isPreview ? "opacity-50 pointer-events-none blur-[1px]" : ""}`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : (
            <TasksTable
              tasks={recentTasks}
              currentMemberId={currentMember?.id ?? ""}
              isAdmin={false}
              onAccept={() => {}}
              onDecline={() => {}}
              onStart={() => {}}
              onComplete={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              readOnly
              showAssignee
              showAssigner
            />
          )}
        </div>
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        currentMemberId={currentMember?.id ?? ""}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
