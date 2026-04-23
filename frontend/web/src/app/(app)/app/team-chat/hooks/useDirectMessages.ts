'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { DirectMessage, TiptapContent } from '@/types/team-chat.types';

interface UseDirectMessagesOptions {
  userId?: string;
  enabled?: boolean;
}

/**
 * Simple hook for direct messages - just fetch, send, and refetch.
 * No polling, no caching complexity.
 */
export function useDirectMessages(options: UseDirectMessagesOptions) {
  const { userId, enabled = true } = options;
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !enabled) {
      // Clear messages when switching away from DM
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        console.log(`[FRONTEND-FETCH-DM] GET DM messages with user: ${userId}`);
        const result = await apiClient.getTeamChatDirectMessages({ userId });
        console.log(`[FRONTEND-FETCH-DM] RESPONSE: Got ${result.items?.length || 0} messages`);
        setMessages(result.items);
        setError(null);
      } catch (err) {
        console.error(`[FRONTEND-FETCH-DM] ERROR:`, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      console.log(`[FRONTEND-POLL-DM] Polling DM messages with user: ${userId}`);
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, enabled]);

  const refetch = async () => {
    if (!userId || !enabled) {
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[FRONTEND-REFETCH-DM] Manual refetch for user: ${userId}`);
      const result = await apiClient.getTeamChatDirectMessages({ userId });
      console.log(`[FRONTEND-REFETCH-DM] RESPONSE: Got ${result.items?.length || 0} messages`);
      setMessages(result.items);
      setError(null);
    } catch (err) {
      console.error(`[FRONTEND-REFETCH-DM] ERROR:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setIsLoading(false);
    }
  };

  const sendDirectMessage = async (content: TiptapContent, mentionedUsers?: string[]) => {
    if (!userId) throw new Error('No recipient specified');

    try {
      console.log(`[FRONTEND-SEND-DM] Sending DM to user: ${userId}`);
      const response = await apiClient.sendTeamChatDirectMessage({
        recipientId: userId,
        content,
        mentionedUsers: mentionedUsers || [],
      });
      console.log(`[FRONTEND-SEND-DM] SENT: messageId=${response.id}`);
      // Refetch after sending
      console.log(`[FRONTEND-SEND-DM] Refetching...`);
      await refetch();
      console.log(`[FRONTEND-SEND-DM] Complete`);
    } catch (err) {
      console.error(`[FRONTEND-SEND-DM] ERROR:`, err);
      throw err;
    }
  };

  return {
    messages,
    isLoading,
    error,
    refetch,
    sendDirectMessage,
  };
}
