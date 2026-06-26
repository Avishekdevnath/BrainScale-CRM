import {
  Bell,
  Clock,
  AlertTriangle,
  Phone,
  CheckSquare,
  ClipboardList,
  FileText,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/types/notifications.types";

export interface NotificationDisplayConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const NOTIFICATION_DISPLAY: Record<NotificationType, NotificationDisplayConfig> = {
  // Follow-ups
  FOLLOWUP_ASSIGNED: {
    icon: Bell,
    color: "text-[var(--groups1-primary)]",
    bg: "bg-[var(--groups1-primary)]/10",
  },
  FOLLOWUP_DUE_SOON: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  FOLLOWUP_OVERDUE: {
    icon: AlertTriangle,
    color: "text-[var(--groups1-error)]",
    bg: "bg-[var(--groups1-error)]/10",
  },
  // Call logs
  CALL_LOG_COMPLETED: {
    icon: Phone,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  // Tasks
  TASK_ASSIGNED: {
    icon: CheckSquare,
    color: "text-[var(--groups1-primary)]",
    bg: "bg-[var(--groups1-primary)]/10",
  },
  TASK_DUE_SOON: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  TASK_ACCEPTED: {
    icon: CheckSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  TASK_STARTED: {
    icon: ClipboardList,
    color: "text-[var(--groups1-primary)]",
    bg: "bg-[var(--groups1-primary)]/10",
  },
  TASK_DECLINED: {
    icon: AlertTriangle,
    color: "text-[var(--groups1-error)]",
    bg: "bg-[var(--groups1-error)]/10",
  },
  TASK_COMPLETED: {
    icon: CheckSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  TASK_CANCELLED: {
    icon: AlertTriangle,
    color: "text-[var(--groups1-text-secondary)]",
    bg: "bg-[var(--groups1-secondary)]",
  },
  // Forms
  FORM_RESPONSE_RECEIVED: {
    icon: FileText,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  // Feedback
  FEEDBACK_REPLY: {
    icon: MessageSquare,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
};

const FALLBACK: NotificationDisplayConfig = {
  icon: Bell,
  color: "text-[var(--groups1-primary)]",
  bg: "bg-[var(--groups1-primary)]/10",
};

export function getNotificationDisplay(type: string): NotificationDisplayConfig {
  return (NOTIFICATION_DISPLAY as Record<string, NotificationDisplayConfig>)[type] ?? FALLBACK;
}

export interface PreferenceRow {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: "followupAssigned",
    label: "Follow-up Assigned",
    description: "When a follow-up is assigned to you",
    defaultValue: true,
  },
  {
    key: "followupDueSoon",
    label: "Follow-up Due Soon",
    description: "When a follow-up is due within 24 hours",
    defaultValue: true,
  },
  {
    key: "followupOverdue",
    label: "Follow-up Overdue",
    description: "When a pending follow-up is past its due date",
    defaultValue: true,
  },
  {
    key: "callLogCompleted",
    label: "Call Log Completed",
    description: "When a call log is completed in your workspace",
    defaultValue: false,
  },
  {
    key: "taskAssigned",
    label: "Task Assigned",
    description: "When a task is assigned to you",
    defaultValue: true,
  },
  {
    key: "taskDueSoon",
    label: "Task Due Soon",
    description: "When a task assigned to you is due within 24 hours",
    defaultValue: true,
  },
  {
    key: "taskUpdated",
    label: "Task Status Updates",
    description: "When a task you created is accepted, started, declined, completed, or cancelled",
    defaultValue: true,
  },
  {
    key: "formResponseReceived",
    label: "Form Response Received",
    description: "When someone submits a response to your form",
    defaultValue: true,
  },
];
