"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useTasks, useTaskTypes } from "@/hooks/useTasks";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { TasksTable } from "@/components/tasks/TasksTable";
import { TaskFilters, type TaskFilterState } from "@/components/tasks/TaskFilters";
import { TasksEmptyPreview } from "@/components/tasks/TasksEmptyPreview";
import {
  AcceptDeclineDialog,
  CompleteTaskDialog,
  EditTaskDialog,
  DeleteTaskDialog,
} from "@/components/tasks/TaskDialogs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { mutate as globalMutate } from "swr";
import type { Task } from "@/types/tasks.types";

export default function AllTasksPage() {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const isAdmin = useIsAdmin();
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);
  const { members } = useWorkspaceMembers(workspaceId ?? null);

  // Redirect non-admins
  useEffect(() => {
    if (isAdmin === false) {
      router.replace("/app/tasks");
    }
  }, [isAdmin, router]);

  const [filters, setFilters] = useState<TaskFilterState>({});
  const [acceptTask, setAcceptTask] = useState<Task | null>(null);
  const [declineTask, setDeclineTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { data: taskTypes = [] } = useTaskTypes();
  const { data: tasksData, isLoading, mutate } = useTasks(filters);

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

  const handleSuccess = () => {
    mutate();
    globalMutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
  };

  if (isAdmin === false) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">All Tasks</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">All tasks across the workspace</p>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2 rounded-md text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters with member filter */}
      <TaskFilters
        value={filters}
        onChange={setFilters}
        showMemberFilter
        members={members.map((m) => ({ id: m.id, user: { name: m.user?.name ?? null } }))}
        memberFilterLabel="Assignee"
        memberFilterField="assignedToId"
        taskTypes={taskTypes}
      />

      {/* Table */}
      <div className="rounded-xl bg-[var(--groups1-card)] shadow-sm">
        {isPageLoading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-[var(--groups1-border)]">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        ) : tasks.length === 0 ? (
          <TasksEmptyPreview
            message="No tasks in the workspace yet. Here's a preview of what this will look like:"
            showAssignee
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
              showAssignee
              showAssigner
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AcceptDeclineDialog
        open={!!acceptTask}
        onOpenChange={(o) => { if (!o) setAcceptTask(null); }}
        task={acceptTask}
        intent="accept"
        onSuccess={handleSuccess}
      />
      <AcceptDeclineDialog
        open={!!declineTask}
        onOpenChange={(o) => { if (!o) setDeclineTask(null); }}
        task={declineTask}
        intent="decline"
        onSuccess={handleSuccess}
      />
      <CompleteTaskDialog
        open={!!completeTask}
        onOpenChange={(o) => { if (!o) setCompleteTask(null); }}
        task={completeTask}
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
