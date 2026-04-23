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
  AcceptDeclineDialog,
  CompleteTaskDialog,
  EditTaskDialog,
  DeleteTaskDialog,
} from "@/components/tasks/TaskDialogs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { mutate as globalMutate } from "swr";
import type { Task } from "@/types/tasks.types";

export default function MyTasksPage() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const isAdmin = useIsAdmin();
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);
  const { members } = useWorkspaceMembers(workspaceId ?? null);

  const [filters, setFilters] = useState<TaskFilterState>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptTask, setAcceptTask] = useState<Task | null>(null);
  const [declineTask, setDeclineTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { data: taskTypes = [] } = useTaskTypes();
  const { data: tasksData, isLoading, mutate } = useTasks(
    currentMember
      ? { assignedToId: currentMember.id, ...filters }
      : {}
  );

  const tasks = tasksData?.data ?? [];
  const isPageLoading = isLoading || !currentMember;

  const handleStart = async (task: Task) => {
    try {
      await apiClient.startTask(task.id);
      toast.success("Task started");
      mutate();
      globalMutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start task");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Tasks</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">Tasks assigned to you</p>
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
            Assign to Me
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
            message="No tasks assigned to you yet. Here's what your task list will look like:"
            showAssigner
          />
        ) : (
          <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
            <TasksTable
              tasks={tasks}
              currentMemberId={currentMember?.id ?? ""}
              isAdmin={isAdmin}
              onAccept={(t) => setAcceptTask(t)}
              onDecline={(t) => setDeclineTask(t)}
              onStart={handleStart}
              onComplete={(t) => setCompleteTask(t)}
              onEdit={(t) => setEditTask(t)}
              onDelete={(t) => setDeleteTask(t)}
              showAssigner
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
        onSuccess={() => mutate()}
      />
      <AcceptDeclineDialog
        open={!!acceptTask}
        onOpenChange={(o) => { if (!o) setAcceptTask(null); }}
        task={acceptTask}
        intent="accept"
        onSuccess={() => mutate()}
      />
      <AcceptDeclineDialog
        open={!!declineTask}
        onOpenChange={(o) => { if (!o) setDeclineTask(null); }}
        task={declineTask}
        intent="decline"
        onSuccess={() => mutate()}
      />
      <CompleteTaskDialog
        open={!!completeTask}
        onOpenChange={(o) => { if (!o) setCompleteTask(null); }}
        task={completeTask}
        onSuccess={() => mutate()}
      />
      <EditTaskDialog
        open={!!editTask}
        onOpenChange={(o) => { if (!o) setEditTask(null); }}
        task={editTask}
        onSuccess={() => mutate()}
      />
      <DeleteTaskDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        task={deleteTask}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
