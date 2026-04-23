'use client';

import { useEffect, useCallback, useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import type { Channel } from '@/types/team-chat.types';
import { useTeamChat } from './useTeamChat';

interface UseChannelsOptions {
  workspaceId?: string;
  enabled?: boolean;
  revalidateInterval?: number; // milliseconds, default 30000 (30 seconds)
}

/**
 * Hook to fetch and manage channels for a workspace
 * Channels are fetched once and revalidated periodically
 */
export function useChannels(options: UseChannelsOptions = {}) {
  const {
    workspaceId,
    enabled = true,
    revalidateInterval = 30000, // 30 seconds default
  } = options;

  const { channels, setChannels, addChannel, updateChannel, removeChannel } = useTeamChat();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch channels
  const { data, error: swrError, mutate, isValidating } = useSWR(
    enabled ? `/api/v1/team-chat/channels` : null,
    async () => {
      return apiClient.getTeamChatChannels(workspaceId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: revalidateInterval,
      focusThrottleInterval: revalidateInterval,
    }
  );

  // Handle data load
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setChannels(data);
      setError(null);
    }
  }, [data, setChannels]);

  // Handle loading state
  useEffect(() => {
    setIsLoading(isValidating);
  }, [isValidating]);

  // Handle error
  useEffect(() => {
    if (swrError) {
      setError(swrError);
    }
  }, [swrError]);

  // Refetch channels
  const refetch = useCallback(async () => {
    return mutate();
  }, [mutate]);

  // Create a new channel
  const createChannel = useCallback(
    async (name: string, description?: string) => {
      try {
        const newChannel = await apiClient.createTeamChatChannel({ name, description }, workspaceId);
        // Refetch to get fresh list from server
        await mutate();
        return newChannel;
      } catch (err) {
        console.error('Error creating channel:', err);
        throw err;
      }
    },
    [workspaceId, mutate]
  );

  // Mark channel as read
  const markAsRead = useCallback(
    async (channelId: string) => {
      try {
        await apiClient.markTeamChatChannelAsRead(channelId);

        // Update local state
        updateChannel(channelId, {
          members: channels
            .find((c) => c.id === channelId)
            ?.members?.map((m) =>
              m.userId === useAuthStore.getState().user?.id
                ? { ...m, lastReadAt: new Date().toISOString() }
                : m
            ),
        });
      } catch (err) {
        console.error('Error marking channel as read:', err);
      }
    },
    [workspaceId, updateChannel, channels]
  );

  return {
    channels,
    isLoading,
    error,
    refetch,
    createChannel,
    markAsRead,
  };
}
