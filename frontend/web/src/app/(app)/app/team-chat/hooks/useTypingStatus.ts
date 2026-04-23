'use client';

import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useTeamChat } from './useTeamChat';

interface UseTypingStatusOptions {
  channelId?: string;
  dmUserId?: string;
  enabled?: boolean;
  pollInterval?: number;
}

/**
 * Hook to manage typing status — poll who is typing and send own typing status
 */
export function useTypingStatus(options: UseTypingStatusOptions = {}) {
  const { channelId, dmUserId, enabled = true, pollInterval = 2000 } = options;
  const { typingUsers, setTypingUsers } = useTeamChat();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Poll for typing status
  useEffect(() => {
    if (!enabled || (!channelId && !dmUserId)) return;

    const params = new URLSearchParams();
    if (channelId) params.set('channelId', channelId);
    if (dmUserId) params.set('dmUserId', dmUserId);

    const poll = async () => {
      try {
        const data = await apiClient.getTeamChatTypingStatus({ channelId, dmUserId });
        setTypingUsers(
          data.map((status) => ({
            id: `${status.userId}:${channelId || dmUserId || 'typing'}`,
            userId: status.userId,
            channelId,
            dmUserId,
            expiresAt: new Date(Date.now() + 5000).toISOString(),
            typingUser: {
              id: status.userId,
              name: status.userName || 'Someone',
              email: '',
            },
          }))
        );
      } catch {
        // silently ignore
      }
    };

    poll();
    pollRef.current = setInterval(poll, pollInterval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [enabled, channelId, dmUserId, pollInterval]);

  /**
   * Call this whenever the user types in the editor.
   * Sends the typing status and auto-clears after 4s of inactivity.
   */
  const reportTyping = async () => {
    if (!channelId && !dmUserId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      try {
        await apiClient.reportTeamChatTyping({ channelId, dmUserId });
      } catch {
        // silently ignore
      }
    }

    // Auto-clear after 4 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 4000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return { typingUsers, reportTyping };
}
