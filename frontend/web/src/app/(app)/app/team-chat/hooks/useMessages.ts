'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Message } from '@/types/team-chat.types';

interface UseMessagesOptions {
  channelId?: string;
  enabled?: boolean;
}

/**
 * Simple hook for channel messages - just fetch and refetch.
 * No polling, no caching complexity.
 */
export function useMessages(options: UseMessagesOptions) {
  const { channelId, enabled = true } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId || !enabled) {
      // Clear messages when switching away from channel
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        console.log(`[FRONTEND-FETCH] GET messages from channel: ${channelId}`);
        const result = await apiClient.getTeamChatMessages({ channelId });
        console.log(`[FRONTEND-FETCH] RESPONSE: Got ${result.items?.length || 0} messages`);
        setMessages(result.items);
        setError(null);
      } catch (err) {
        console.error(`[FRONTEND-FETCH] ERROR:`, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      console.log(`[FRONTEND-POLL] Polling messages from channel: ${channelId}`);
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [channelId, enabled]);

  const refetch = async () => {
    if (!channelId || !enabled) {
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[FRONTEND-REFETCH] Manual refetch for channel: ${channelId}`);
      const result = await apiClient.getTeamChatMessages({ channelId });
      console.log(`[FRONTEND-REFETCH] RESPONSE: Got ${result.items?.length || 0} messages`);
      setMessages(result.items);
      setError(null);
    } catch (err) {
      console.error(`[FRONTEND-REFETCH] ERROR:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    error,
    refetch,
  };
}
