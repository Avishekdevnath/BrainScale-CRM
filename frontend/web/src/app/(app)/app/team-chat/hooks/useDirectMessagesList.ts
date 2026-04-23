'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { DmConversation } from '@/types/team-chat.types';
import { useTeamChat } from './useTeamChat';

interface UseDirectMessagesListOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook to fetch and poll for the list of DM conversations
 */
export function useDirectMessagesList(options: UseDirectMessagesListOptions = {}) {
  const { enabled = true, pollingInterval = 5000 } = options;

  const { setDmConversations, dmConversations } = useTeamChat();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = async () => {
    try {
      const data: DmConversation[] = await apiClient.getTeamChatDirectMessagesList();
      setDmConversations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch DM list'));
    }
  };

  useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    fetchList().finally(() => setIsLoading(false));

    intervalRef.current = setInterval(fetchList, pollingInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollingInterval]);

  return { dmConversations, isLoading, error, refetch: fetchList };
}
