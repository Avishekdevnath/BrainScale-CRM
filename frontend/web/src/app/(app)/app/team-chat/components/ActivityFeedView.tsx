'use client';

import { useMemo, useState } from 'react';
import {
  AtSign,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ChatHeader from './ChatHeader';
import type { Notification, NotificationType } from '@/types/team-chat.types';

interface ActivityFeedViewProps {
  notifications: Notification[];
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (notificationId: string) => void;
  onOpenNotification?: (notification: Notification) => void;
  onMenuClick?: () => void;
}

type FilterTab = 'all' | 'unread' | 'mentions';

function iconForType(type: NotificationType) {
  switch (type) {
    case 'mention':
      return AtSign;
    case 'direct_message':
      return MessageSquare;
    default:
      return MessageSquare;
  }
}

function accentForType(type: NotificationType) {
  switch (type) {
    case 'mention':
      return {
        bg: 'bg-[var(--groups1-primary)]/15',
        fg: 'text-[var(--groups1-primary)]',
      };
    case 'direct_message':
      return {
        bg: 'bg-[var(--groups1-secondary)]',
        fg: 'text-[var(--groups1-text-secondary)]',
      };
    default:
      return {
        bg: 'bg-[var(--groups1-secondary)]',
        fg: 'text-[var(--groups1-text-secondary)]',
      };
  }
}

export default function ActivityFeedView({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onOpenNotification,
  onMenuClick,
}: ActivityFeedViewProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead);
    const mentions = notifications.filter((n) => n.type === 'mention');
    return { unread: unread.length, mentions: mentions.length, total: notifications.length };
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'mentions') return notifications.filter((n) => n.type === 'mention');
    return notifications;
  }, [filter, notifications]);

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'unread', label: 'Unread', count: counts.unread },
    { key: 'mentions', label: 'Mentions', count: counts.mentions },
  ];

  const headerActions =
    counts.unread > 0 && onMarkAllAsRead ? (
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkAllAsRead}
        className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
      >
        <CheckCheck className="w-4 h-4 mr-2" />
        Mark all as read
      </Button>
    ) : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--groups1-background)]">
      {/* Header (matches Brain Chat) */}
      <ChatHeader
        title="Activity Feed"
        subtitle={
          counts.total === 0
            ? 'Mentions, alerts, and system updates appear here.'
            : `${counts.total} notification${counts.total !== 1 ? 's' : ''}${
                counts.unread > 0 ? ` · ${counts.unread} unread` : ''
              }`
        }
        actions={headerActions}
        onMenuClick={onMenuClick}
      />

      {/* Filter tabs */}
      <div className="flex-shrink-0 px-4 md:px-6 py-2.5 border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors flex-shrink-0',
                active
                  ? 'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]'
                  : 'text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    active
                      ? 'bg-[var(--groups1-btn-primary-text)]/20'
                      : 'bg-[var(--groups1-secondary)]'
                  )}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-base font-semibold text-[var(--groups1-text)]">
                {filter === 'unread'
                  ? 'All caught up'
                  : filter === 'mentions'
                  ? 'No mentions yet'
                  : 'No notifications yet'}
              </p>
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                {filter === 'mentions'
                  ? 'When someone @mentions you, it will show here.'
                  : "You'll see mentions, alerts, and system updates here."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--groups1-border)]">
            {filtered.map((notification) => {
              const Icon = iconForType(notification.type);
              const accent = accentForType(notification.type);
              const isUnread = !notification.isRead;
              const isClickable = !!onOpenNotification;

              return (
                <li
                  key={notification.id}
                  className={cn(
                    'group relative px-4 md:px-6 py-3 transition-colors',
                    isUnread
                      ? 'bg-[var(--groups1-secondary)]/40 hover:bg-[var(--groups1-secondary)]'
                      : 'hover:bg-[var(--groups1-secondary)]/40',
                    isClickable && 'cursor-pointer'
                  )}
                  onClick={() => onOpenNotification?.(notification)}
                >
                  <div className="flex items-start gap-3">
                    {isUnread && (
                      <span
                        aria-hidden
                        className="absolute left-1 top-5 w-1.5 h-1.5 rounded-full bg-[var(--groups1-primary)]"
                      />
                    )}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                        accent.bg,
                        accent.fg
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm break-words leading-snug',
                          isUnread
                            ? 'text-[var(--groups1-text)] font-medium'
                            : 'text-[var(--groups1-text)]'
                        )}
                      >
                        {notification.content}
                      </p>
                      <p
                        className="text-xs text-[var(--groups1-text-secondary)] mt-1"
                        title={new Date(notification.createdAt).toLocaleString()}
                      >
                        {formatDistanceToNow(parseISO(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUnread && onMarkAsRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          aria-label="Mark as read"
                          title="Mark as read"
                          className="p-1.5 rounded-lg text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                          aria-label="Delete notification"
                          title="Delete"
                          className="p-1.5 rounded-lg text-[var(--groups1-text-secondary)] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
