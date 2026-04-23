"use client";

import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, User, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { RichTextDisplay } from "./RichTextDisplay";
import type { Task } from "@/types/tasks.types";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    status: "AWAITING_ACCEPTANCE" as const,
    label: "Awaiting",
    color: "border-yellow-400",
    headerBg: "bg-yellow-50 dark:bg-yellow-900/10",
    headerText: "text-yellow-700 dark:text-yellow-300",
    dot: "bg-yellow-400",
  },
  {
    status: "ACCEPTED" as const,
    label: "Accepted",
    color: "border-blue-400",
    headerBg: "bg-blue-50 dark:bg-blue-900/10",
    headerText: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  {
    status: "IN_PROGRESS" as const,
    label: "In Progress",
    color: "border-purple-400",
    headerBg: "bg-purple-50 dark:bg-purple-900/10",
    headerText: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-400",
  },
  {
    status: "DONE" as const,
    label: "Done",
    color: "border-green-400",
    headerBg: "bg-green-50 dark:bg-green-900/10",
    headerText: "text-green-700 dark:text-green-300",
    dot: "bg-green-400",
  },
];

// ─── Transition guard ─────────────────────────────────────────────────────────

type TaskStatus = "AWAITING_ACCEPTANCE" | "ACCEPTED" | "IN_PROGRESS" | "DONE" | "DECLINED";

function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  task: Task,
  currentMemberId: string,
  isAdmin: boolean
): { allowed: boolean; reason?: string } {
  const isAssignee = task.assignedToId === currentMemberId;

  // Only forward transitions allowed
  const order: TaskStatus[] = ["AWAITING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS", "DONE"];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (toIdx !== fromIdx + 1) {
    return { allowed: false, reason: "Tasks must move one step at a time" };
  }

  // AWAITING → ACCEPTED: only assignee or admin
  if (from === "AWAITING_ACCEPTANCE" && to === "ACCEPTED") {
    if (!isAssignee && !isAdmin) return { allowed: false, reason: "Only the assignee can accept this task" };
  }
  // ACCEPTED → IN_PROGRESS: only assignee or admin
  if (from === "ACCEPTED" && to === "IN_PROGRESS") {
    if (!isAssignee && !isAdmin) return { allowed: false, reason: "Only the assignee can start this task" };
  }
  // IN_PROGRESS → DONE: only assignee or admin
  if (from === "IN_PROGRESS" && to === "DONE") {
    if (!isAssignee && !isAdmin) return { allowed: false, reason: "Only the assignee can complete this task" };
  }

  return { allowed: true };
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  currentMemberId: string;
  isAdmin: boolean;
  isDragging: boolean;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskCard({
  task,
  currentMemberId,
  isAdmin,
  isDragging,
  onDragStart,
  onDragEnd,
  onComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isAssignee = task.assignedToId === currentMemberId;
  const isAssigner = task.assignedById === currentMemberId;
  const canEdit = isAdmin || isAssigner;
  const canDelete = isAdmin || isAssigner;
  const isOverdue =
    task.isOverdue ||
    ((task.status === "ACCEPTED" || task.status === "IN_PROGRESS") &&
      new Date(task.dueDate) < new Date());

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-xl border bg-[var(--groups1-card)] p-3.5 cursor-grab active:cursor-grabbing",
        "shadow-sm hover:shadow-md transition-all duration-150 select-none",
        "border-[var(--groups1-border)]",
        isDragging && "opacity-40 scale-95 shadow-lg rotate-1",
        isOverdue && "border-l-2 border-l-red-400"
      )}
    >
      {/* Priority + Type badges */}
      {(task.priority === "URGENT" || task.taskType) && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {task.priority === "URGENT" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-2.5 h-2.5" />
              Urgent
            </span>
          )}
          {task.taskType && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: task.taskType.color + "22", color: task.taskType.color, border: `1px solid ${task.taskType.color}44` }}
            >
              {task.taskType.name}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-semibold text-[var(--groups1-text)] leading-snug mb-1.5 line-clamp-2">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <RichTextDisplay content={task.description} preview className="mb-2.5" />
      )}

      {/* Meta row */}
      <div className="flex flex-col gap-1 mt-2">
        {/* Due date */}
        <div className={cn(
          "flex items-center gap-1 text-xs",
          isOverdue ? "text-red-500 dark:text-red-400 font-medium" : "text-[var(--groups1-text-secondary)]"
        )}>
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{format(parseISO(task.dueDate), "dd MMM yyyy")}</span>
          {isOverdue && <span className="text-[10px] font-bold">· OVERDUE</span>}
        </div>

        {/* Assignee name */}
        {task.assignedTo?.user?.name && (
          <div className="flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)]">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{task.assignedTo.user.name}</span>
          </div>
        )}

        {/* Linked entity */}
        {task.linkedEntityType && (
          <div className="flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)]">
            <Tag className="w-3 h-3 flex-shrink-0" />
            <span className="capitalize">{task.linkedEntityType.replace("_", " ")}</span>
          </div>
        )}
      </div>

      {/* Actions — visible on hover */}
      {task.status !== "DONE" && (canEdit || canDelete || (isAssignee && task.status === "IN_PROGRESS")) && (
        <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-[var(--groups1-border)] opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          {isAssignee && task.status === "IN_PROGRESS" && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(task); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 font-medium transition-colors"
            >
              Mark Done
            </button>
          )}
          {canEdit && (task.status as string) !== "DONE" && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-border)] font-medium transition-colors"
            >
              Edit
            </button>
          )}
          {canDelete && (task.status as string) !== "DONE" && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  config: typeof COLUMNS[number];
  tasks: Task[];
  currentMemberId: string;
  isAdmin: boolean;
  draggingTask: Task | null;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDrop: (status: TaskStatus) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function KanbanColumn({
  config,
  tasks,
  currentMemberId,
  isAdmin,
  draggingTask,
  onDragStart,
  onDragEnd,
  onDrop,
  onComplete,
  onEdit,
  onDelete,
}: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const canDrop =
    draggingTask &&
    canTransition(draggingTask.status as TaskStatus, config.status, draggingTask, currentMemberId, isAdmin).allowed;

  return (
    <div
      className="flex flex-col min-w-0"
      onDragOver={(e) => {
        if (canDrop) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (canDrop) onDrop(config.status);
      }}
    >
      {/* Column header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3",
        config.headerBg
      )}>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", config.dot)} />
        <span className={cn("text-xs font-bold uppercase tracking-wider flex-1", config.headerText)}>
          {config.label}
        </span>
        <span className={cn(
          "text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          config.headerBg, config.headerText
        )}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "flex-1 rounded-xl p-2 space-y-2.5 min-h-[200px] transition-all duration-150",
          isDragOver && canDrop
            ? `bg-[var(--groups1-secondary)] border-2 border-dashed ${config.color}`
            : "border-2 border-transparent"
        )}
      >
        {tasks.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-24 text-xs text-[var(--groups1-text-secondary)] opacity-50">
            No tasks
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentMemberId={currentMemberId}
            isAdmin={isAdmin}
            isDragging={draggingTask?.id === task.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {isDragOver && canDrop && (
          <div className={cn(
            "h-16 rounded-xl border-2 border-dashed opacity-40 transition-all",
            config.color
          )} />
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

interface TaskKanbanProps {
  tasks: Task[];
  currentMemberId: string;
  isAdmin: boolean;
  onTransition: (task: Task, toStatus: TaskStatus) => Promise<void>;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskKanban({
  tasks,
  currentMemberId,
  isAdmin,
  onTransition,
  onComplete,
  onEdit,
  onDelete,
}: TaskKanbanProps) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const handleDrop = async (toStatus: TaskStatus) => {
    if (!draggingTask) return;
    const fromStatus = draggingTask.status as TaskStatus;
    if (fromStatus === toStatus) return;

    const { allowed, reason } = canTransition(fromStatus, toStatus, draggingTask, currentMemberId, isAdmin);
    if (!allowed) {
      // toast is handled by the parent via try/catch
      return;
    }
    await onTransition(draggingTask, toStatus);
    setDraggingTask(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.status}
          config={col}
          tasks={tasksByStatus(col.status)}
          currentMemberId={currentMemberId}
          isAdmin={isAdmin}
          draggingTask={draggingTask}
          onDragStart={setDraggingTask}
          onDragEnd={() => setDraggingTask(null)}
          onDrop={handleDrop}
          onComplete={onComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
