"use client";

import type { TaskStatus } from "@/types/tasks.types";

const STATUS_CONFIG: Record<
  TaskStatus | "OVERDUE",
  { label: string; className: string }
> = {
  AWAITING_ACCEPTANCE: {
    label: "Awaiting",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  DONE: {
    label: "Done",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  DECLINED: {
    label: "Declined",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

interface Props {
  status: TaskStatus;
  isOverdue?: boolean;
}

export function TaskStatusBadge({ status, isOverdue }: Props) {
  const key = isOverdue && (status === "ACCEPTED" || status === "IN_PROGRESS") ? "OVERDUE" : status;
  const config = STATUS_CONFIG[key];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
