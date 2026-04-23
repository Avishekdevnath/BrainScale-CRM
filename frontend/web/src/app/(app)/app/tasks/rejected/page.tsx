"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TasksEmptyPreview } from "@/components/tasks/TasksEmptyPreview";
import { DeleteTaskDialog } from "@/components/tasks/TaskDialogs";
import { mutate as globalMutate } from "swr";
import type { Task } from "@/types/tasks.types";

export default function RejectedTasksPage() {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const isAdmin = useIsAdmin();
  const { data: currentMember } = useCurrentMember(workspaceId ?? null);

  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const { data: tasksData, isLoading, mutate } = useTasks({ status: "DECLINED" });

  const tasks = tasksData?.data ?? [];
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
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Rejected Tasks</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">Tasks that were declined by assignees</p>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2 rounded-md text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-card)] shadow-sm">
        {isPageLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        ) : tasks.length === 0 ? (
          <TasksEmptyPreview
            message="No rejected tasks. Here's an example of what declined tasks look like:"
            statusFilter="DECLINED"
            showAssignee
            showAssigner
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--groups1-border)]">
                  <th className="text-left py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Title</th>
                  <th className="text-left py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Status</th>
                  <th className="hidden sm:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Decline Note</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Assignee</th>
                  <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Assigner</th>
                  <th className="hidden lg:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Due Date</th>
                  <th className="text-right py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const canDelete = isAdmin || task.assignedById === currentMember?.id;
                  return (
                    <tr
                      key={task.id}
                      className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-surface)] transition-colors"
                    >
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-medium text-[var(--groups1-text)]">{task.title}</div>
                        {task.declineNote && (
                          <p className="text-xs text-[var(--groups1-text-secondary)] italic mt-0.5 sm:hidden line-clamp-1">
                            {task.declineNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <TaskStatusBadge status={task.status} isOverdue={false} />
                      </td>
                      <td className="hidden sm:table-cell py-3 px-4 text-[var(--groups1-text-secondary)] text-xs max-w-[200px]">
                        {task.declineNote ? (
                          <span className="italic">{task.declineNote}</span>
                        ) : (
                          <span className="opacity-40">No note</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-3 px-4 text-[var(--groups1-text)]">
                        {task.assignedTo?.user?.name ?? "—"}
                      </td>
                      <td className="hidden md:table-cell py-3 px-4 text-[var(--groups1-text)]">
                        {task.assignedBy?.user?.name ?? "—"}
                      </td>
                      <td className="hidden lg:table-cell py-3 px-4 text-[var(--groups1-text)]">
                        {format(parseISO(task.dueDate), "dd MMM yyyy")}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right">
                        {canDelete ? (
                          <button
                            onClick={() => setDeleteTask(task)}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--groups1-text-secondary)] opacity-50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteTaskDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        task={deleteTask}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
