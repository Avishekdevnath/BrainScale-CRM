"use client";

import { useState } from "react";
import { Plus, RefreshCw, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/hooks/useTasks";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import {
  CreateTaskDialog,
  CompleteTaskDialog,
  EditTaskDialog,
  DeleteTaskDialog,
} from "@/components/tasks/TaskDialogs";
import { MOCK_TASKS } from "@/components/tasks/mockTasks";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { mutate as globalMutate } from "swr";
import type { Task } from "@/types/tasks.types";

type TaskStatus = "AWAITING_ACCEPTANCE" | "ACCEPTED" | "IN_PROGRESS" | "DONE" | "DECLINED";

export default function KanbanPage() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const isAdmin = useIsAdmin();
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);
  const { members } = useWorkspaceMembers(workspaceId ?? null);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  // Admins see all; members see their own tasks
  const taskParams = currentMember
    ? isAdmin
      ? { size: 100 }
      : { size: 100, assignedToId: currentMember.id }
    : {};

  const { data: tasksData, isLoading, mutate } = useTasks(taskParams);

  const rawTasks = (tasksData?.data ?? []).filter((t) => t.status !== "DECLINED");
  const isPreview = !isLoading && rawTasks.length === 0;
  const tasks = isPreview ? MOCK_TASKS.filter((t) => t.status !== "DECLINED") : rawTasks;
  const isPageLoading = isLoading || !currentMember;

  const invalidateKpi = () =>
    globalMutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));

  const handleTransition = async (task: Task, toStatus: TaskStatus) => {
    try {
      if (toStatus === "ACCEPTED") {
        await apiClient.acceptTask(task.id);
        toast.success("Task accepted");
      } else if (toStatus === "IN_PROGRESS") {
        await apiClient.startTask(task.id);
        toast.success("Task started");
      } else if (toStatus === "DONE") {
        // Open complete dialog instead of auto-completing (allows completion note)
        setCompleteTask(task);
        return;
      }
      mutate();
      invalidateKpi();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update task");
    }
  };

  const handleSuccess = () => {
    mutate();
    invalidateKpi();
  };

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--groups1-secondary)]">
            <LayoutGrid className="w-5 h-5 text-[var(--groups1-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Kanban Board</h1>
              {isPreview && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]">
                  Preview
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">
              {isPreview ? "Sample data — create your first task to get started" : isAdmin ? "All workspace tasks" : "Your tasks"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2 rounded-md text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Board */}
      {isPageLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[var(--groups1-text-secondary)]">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading board...</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className={`min-w-[900px] h-full ${isPreview ? "opacity-50 pointer-events-none blur-[1px]" : ""}`}>
            <TaskKanban
              tasks={tasks}
              currentMemberId={currentMember?.id ?? ""}
              isAdmin={isAdmin}
              onTransition={handleTransition}
              onComplete={(t) => setCompleteTask(t)}
              onEdit={(t) => setEditTask(t)}
              onDelete={(t) => setDeleteTask(t)}
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        currentMemberId={currentMember?.id ?? ""}
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
