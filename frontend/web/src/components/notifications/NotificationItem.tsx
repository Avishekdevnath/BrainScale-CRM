"use client";

import Link from "next/link";
import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { getNotificationDisplay } from "@/lib/notification-registry";
import type { Notification } from "@/types/notifications.types";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

/** Deep-link target for a notification, or null if it isn't navigable. */
function notificationHref(type: string): string | null {
  if (type === "FEEDBACK_REPLY") return "/app/settings";
  return null;
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const config = getNotificationDisplay(notification.type);
  const Icon = config.icon;
  const href = notificationHref(notification.type);

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
      {(() => {
        const inner = (
          <>
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
          </>
        );
        return href ? (
          <Link
            href={href}
            onClick={() => { if (!notification.isRead) onRead(notification.id); }}
            className="flex-1 min-w-0"
          >
            {inner}
          </Link>
        ) : (
          <div className="flex-1 min-w-0">{inner}</div>
        );
      })()}

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
