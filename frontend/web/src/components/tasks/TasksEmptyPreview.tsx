"use client";

import { Sparkles } from "lucide-react";
import { TasksTable } from "./TasksTable";
import { MOCK_TASKS } from "./mockTasks";
import type { Task } from "@/types/tasks.types";

interface TasksEmptyPreviewProps {
  message?: string;
  showAssignee?: boolean;
  showAssigner?: boolean;
  statusFilter?: Task["status"];
}

export function TasksEmptyPreview({
  message = "No tasks yet. Here's a preview of what your task list will look like:",
  showAssignee,
  showAssigner,
  statusFilter,
}: TasksEmptyPreviewProps) {
  const previewTasks = statusFilter
    ? MOCK_TASKS.filter((t) => t.status === statusFilter)
    : MOCK_TASKS;

  return (
    <div className="relative">
      {/* Hint banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 mb-0 rounded-t-xl bg-[var(--groups1-primary)]/8 border border-b-0 border-[var(--groups1-primary)]/20">
        <Sparkles className="w-3.5 h-3.5 text-[var(--groups1-primary)] flex-shrink-0" />
        <p className="text-xs text-[var(--groups1-text-secondary)]">{message}</p>
      </div>

      {/* Blurred mock table */}
      <div className="relative overflow-hidden rounded-b-xl border border-[var(--groups1-border)] border-t-[var(--groups1-primary)]/20">
        <div className="pointer-events-none select-none opacity-40 blur-[1.5px]">
          <TasksTable
            tasks={previewTasks}
            currentMemberId=""
            isAdmin={false}
            onAccept={() => {}}
            onDecline={() => {}}
            onStart={() => {}}
            onComplete={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            readOnly
            showAssignee={showAssignee}
            showAssigner={showAssigner}
          />
        </div>

        {/* Fade gradient at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--groups1-card)] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
