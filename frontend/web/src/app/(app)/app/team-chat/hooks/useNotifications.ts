'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Notification } from '@/types/team-chat.types';
import { useTeamChat } from './useTeamChat';

interface UseNotificationsOptions {
  enabled?: boolean;
  pollingInterval?: number; // milliseconds, default 5000
  requestPushPermission?: boolean; // Request push permission on first mention
}

/**
 * Hook to fetch and poll for notifications
 * Implements soft permission request for Web Push on first mention
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 5000, // 5 seconds default
    requestPushPermission = true,
  } = options;

  const { notifications, setNotifications, addNotification } = useTeamChat();
  const lastSyncRef = useRef<number>(0);
  const dedupeSetRef = useRef<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pushPermissionRequested, setPushPermissionRequested] = useState(false);

  // Fetch notifications
  const { data, error: swrError, mutate } = useSWR(
    enabled ? '/api/v1/team-chat/notifications' : null,
    async () => {
      return apiClient.getTeamChatNotifications();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
      focusThrottleInterval: pollingInterval,
    }
  );

  // Handle initial data load
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setNotifications(data);

      // Initialize dedup set
      dedupeSetRef.current.clear();
      data.forEach((notif: Notification) => {
        dedupeSetRef.current.add(notif.id);
      });

      lastSyncRef.current = Date.now();
    }
  }, [data, setNotifications]);

  // Request push permission on first mention (soft prompt)
  const requestPushPermissionIfNeeded = useCallback(async () => {
    if (!requestPushPermission || pushPermissionRequested) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const permission = Notification.permission;

      if (permission === 'default') {
        setPushPermissionRequested(true);
        toast('Get notified for mentions & DMs?', {
          description: 'We\'ll only ping you for messages that need your attention.',
          duration: 12000,
          action: {
            label: 'Enable',
            onClick: async () => {
              try {
                const result = await Notification.requestPermission();
                if (result === 'granted') {
                  const registration = await navigator.serviceWorker.ready;
                  if (!registration.pushManager) return;
                  await registration.pushManager.getSubscription();
                  toast.success('Notifications enabled');
                } else if (result === 'denied') {
                  toast.error('Notifications blocked in browser settings');
                }
              } catch (err) {
                console.error('Error enabling notifications:', err);
              }
            },
          },
          cancel: {
            label: 'Not now',
            onClick: () => {},
          },
        });
      } else if (permission === 'granted') {
        setPushPermissionRequested(true);
      }
    } catch (err) {
      console.error('Error requesting push permission:', err);
    }
  }, [requestPushPermission, pushPermissionRequested]);

  // Polling mechanism for new notifications
  useEffect(() => {
    if (!enabled) return;

    const pollInterval = setInterval(async () => {
      try {
        setIsLoading(true);
        const newNotifications = await apiClient.getTeamChatNotifications();

        const dedupedNotifications = newNotifications.filter((notif: Notification) => {
          if (dedupeSetRef.current.has(notif.id)) return false;
          dedupeSetRef.current.add(notif.id);
          return true;
        });

        dedupedNotifications.forEach((notif: Notification) => {
          addNotification(notif);
          if (notif.type === 'mention') {
            requestPushPermissionIfNeeded();
          }
        });

        lastSyncRef.current = Date.now();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Polling error'));
      } finally {
        setIsLoading(false);
      }
    }, pollingInterval);

    return () => clearInterval(pollInterval);
  }, [enabled, addNotification, pollingInterval, requestPushPermissionIfNeeded]);

  // Handle SWR error
  useEffect(() => {
    if (swrError) {
      setError(swrError);
    }
  }, [swrError]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markTeamChatNotificationAsRead(notificationId);

      // Update local state
      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      setNotifications(updated);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notifications, setNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllTeamChatNotificationsAsRead();

      // Update local state
      const updated = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications, setNotifications]);

  // Refetch
  const refetch = useCallback(async () => {
    return mutate();
  }, [mutate]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    refetch,
    markAsRead,
    markAllAsRead,
    mutate,
  };
}
