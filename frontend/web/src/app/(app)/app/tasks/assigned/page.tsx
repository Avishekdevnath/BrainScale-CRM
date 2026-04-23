"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks, useTaskTypes } from "@/hooks/useTasks";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { TasksTable } from "@/components/tasks/TasksTable";
import { TaskFilters, type TaskFilterState } from "@/components/tasks/TaskFilters";
import { TasksEmptyPreview } from "@/components/tasks/TasksEmptyPreview";
import {
  CreateTaskDialog,
  EditTaskDialog,
  DeleteTaskDialog,
} from "@/components/tasks/TaskDialogs";
import { mutate as globalMutate } from "swr";
import type { Task } from "@/types/tasks.types";

export default function AssignedByMePage() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const isAdmin = useIsAdmin();
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);
  const { members } = useWorkspaceMembers(workspaceId ?? null);

  const [filters, setFilters] = useState<TaskFilterState>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { data: taskTypes = [] } = useTaskTypes();
  const { data: tasksData, isLoading, mutate } = useTasks(
    currentMember
      ? { assignedById: currentMember.id, ...filters }
      : {}
  );

  // Exclude self-assigned tasks
  const tasks = (tasksData?.data ?? []).filter(
    (t) => t.assignedToId !== t.assignedById
  );

  const isPageLoading = isLoading || !currentMember;

  const handleSuccess = () => {
    mutate();
    globalMutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Assigned by Me</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">Tasks you've assigned to others</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2 rounded-md text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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

      {/* Filters */}
      <TaskFilters value={filters} onChange={setFilters} taskTypes={taskTypes} />

      {/* Table */}
      <div className="rounded-xl bg-[var(--groups1-card)] shadow-sm">
        {isPageLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-[var(--groups1-border)]">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        ) : tasks.length === 0 ? (
          <TasksEmptyPreview
            message="You haven't assigned any tasks yet. Here's what it will look like:"
            showAssignee
          />
        ) : (
          <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
            <TasksTable
              tasks={tasks}
              currentMemberId={currentMember?.id ?? ""}
              isAdmin={isAdmin}
              onAccept={() => {}}
              onDecline={() => {}}
              onStart={() => {}}
              onComplete={() => {}}
              onEdit={(t) => setEditTask(t)}
              onDelete={(t) => setDeleteTask(t)}
              showAssignee
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        currentMemberId={currentMember?.id ?? ""}
        onSuccess={handleSuccess}
      />
      <EditTaskDialog
        open={!!editTask}
        onOpenChange={(o) => { if (!o) setEditTask(null); }}
        task={editTask}
        onSuccess={handleSuccess}
      />
      <DeleteTaskDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        task={deleteTask}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
