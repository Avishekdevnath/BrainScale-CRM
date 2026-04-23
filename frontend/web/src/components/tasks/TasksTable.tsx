"use client";

import { format, parseISO } from "date-fns";
import type { Task } from "@/types/tasks.types";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { RichTextDisplay } from "./RichTextDisplay";

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", className: "text-red-600 font-semibold" },
  NORMAL: { label: "Normal", className: "text-[var(--groups1-text-secondary)]" },
};

const LINKED_TYPE_LABEL: Record<string, string> = {
  call_list: "Call List",
  group: "Group",
  student: "Student",
  form: "Form",
};

interface TaskRowActionsProps {
  task: Task;
  currentMemberId: string;
  isAdmin: boolean;
  onAccept: (task: Task) => void;
  onDecline: (task: Task) => void;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskRowActions({
  task,
  currentMemberId,
  isAdmin,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onEdit,
  onDelete,
}: TaskRowActionsProps) {
  const isAssignee = task.assignedToId === currentMemberId;
  const isAssigner = task.assignedById === currentMemberId;
  const canEdit = isAdmin || isAssigner;
  const canDelete = isAdmin || isAssigner;
  const canAccept = (isAdmin || isAssignee) && task.status === "AWAITING_ACCEPTANCE";
  const canDecline = isAssignee && (task.status === "AWAITING_ACCEPTANCE" || task.status === "ACCEPTED");
  const canStart = (isAdmin || isAssignee) && task.status === "ACCEPTED";
  const canComplete = (isAdmin || isAssignee) && task.status === "IN_PROGRESS";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {canAccept && (
        <button
          onClick={() => onAccept(task)}
          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
        >
          Accept
        </button>
      )}
      {canDecline && (
        <button
          onClick={() => onDecline(task)}
          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
        >
          Decline
        </button>
      )}
      {canStart && (
        <button
          onClick={() => onStart(task)}
          className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
        >
          Start
        </button>
      )}
      {canComplete && (
        <button
          onClick={() => onComplete(task)}
          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
        >
          Done
        </button>
      )}
      {canEdit && task.status !== "DONE" && (
        <button
          onClick={() => onEdit(task)}
          className="text-xs px-2 py-1 rounded bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-border)]"
        >
          Edit
        </button>
      )}
      {canDelete && task.status !== "DONE" && (
        <button
          onClick={() => onDelete(task)}
          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
        >
          Delete
        </button>
      )}
    </div>
  );
}

interface TasksTableProps {
  tasks: Task[];
  currentMemberId: string;
  isAdmin: boolean;
  onAccept: (task: Task) => void;
  onDecline: (task: Task) => void;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  showAssignee?: boolean;
  showAssigner?: boolean;
  readOnly?: boolean;
}

export function TasksTable({
  tasks,
  currentMemberId,
  isAdmin,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  showAssignee = false,
  showAssigner = false,
  readOnly = false,
}: TasksTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--groups1-text-secondary)]">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--groups1-border)]">
            <th className="text-left py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Title</th>
            <th className="text-left py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Status</th>
            <th className="hidden sm:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Priority</th>
            <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Due Date</th>
            <th className="hidden lg:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Linked</th>
            {showAssignee && (
              <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Assignee</th>
            )}
            {showAssigner && (
              <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-[var(--groups1-text-secondary)]">Assigner</th>
            )}
            {!readOnly && (
              <th className="text-right py-3 px-3 sm:px-4 font-medium text-[var(--groups1-text-secondary)]">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-surface)] transition-colors"
            >
              <td className="py-3 px-3 sm:px-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--groups1-text)]">{task.title}</span>
                  {task.taskType && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: task.taskType.color + "22", color: task.taskType.color, border: `1px solid ${task.taskType.color}44` }}
                    >
                      {task.taskType.name}
                    </span>
                  )}
                </div>
                {task.description && (
                  <RichTextDisplay content={task.description} preview className="mt-0.5" />
                )}
                {/* Mobile-only secondary info */}
                <div className="flex items-center gap-2 mt-1 sm:hidden">
                  <span className={`text-[10px] ${PRIORITY_CONFIG[task.priority].className}`}>
                    {PRIORITY_CONFIG[task.priority].label}
                  </span>
                  <span className="text-[10px] text-[var(--groups1-text-secondary)]">
                    {format(parseISO(task.dueDate), "dd MMM")}
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <TaskStatusBadge status={task.status} isOverdue={task.isOverdue} />
              </td>
              <td className="hidden sm:table-cell py-3 px-4">
                <span className={`text-xs ${PRIORITY_CONFIG[task.priority].className}`}>
                  {PRIORITY_CONFIG[task.priority].label}
                </span>
              </td>
              <td className="hidden md:table-cell py-3 px-4 text-[var(--groups1-text)]">
                {format(parseISO(task.dueDate), "dd MMM yyyy")}
              </td>
              <td className="hidden lg:table-cell py-3 px-4">
                {task.linkedEntityType ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]">
                    {LINKED_TYPE_LABEL[task.linkedEntityType] ?? task.linkedEntityType}
                  </span>
                ) : (
                  <span className="text-[var(--groups1-text-secondary)]">—</span>
                )}
              </td>
              {showAssignee && (
                <td className="hidden md:table-cell py-3 px-4 text-[var(--groups1-text)]">
                  {task.assignedTo?.user?.name ?? <span className="text-[var(--groups1-text-secondary)]">—</span>}
                </td>
              )}
              {showAssigner && (
                <td className="hidden md:table-cell py-3 px-4 text-[var(--groups1-text)]">
                  {task.assignedBy?.user?.name ?? <span className="text-[var(--groups1-text-secondary)]">—</span>}
                </td>
              )}
              {!readOnly && (
                <td className="py-3 px-3 sm:px-4 text-right">
                  <TaskRowActions
                    task={task}
                    currentMemberId={currentMemberId}
                    isAdmin={isAdmin}
                    onAccept={onAccept}
                    onDecline={onDecline}
                    onStart={onStart}
                    onComplete={onComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
