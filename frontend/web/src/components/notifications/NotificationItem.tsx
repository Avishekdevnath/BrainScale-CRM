"use client";

import { Bell, Clock, AlertTriangle, Phone, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notifications.types";

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
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
  CALL_LOG_COMPLETED: {
    icon: Phone,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const config = typeConfig[notification.type] ?? typeConfig.FOLLOWUP_ASSIGNED;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--groups1-secondary)]",
        !notification.isRead && "border-l-2 border-[var(--groups1-primary)] bg-[var(--groups1-primary)]/5"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          config.bg
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug text-[var(--groups1-text)]",
            !notification.isRead && "font-medium"
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5 leading-snug line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1 opacity-70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Actions (show on hover) */}
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            title="Mark as read"
            onClick={() => onRead(notification.id)}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-[var(--groups1-error)] hover:text-[var(--groups1-error)]"
          title="Delete"
          onClick={() => onDelete(notification.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
