'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { MessageReaction, TiptapContent } from '@/types/team-chat.types';
import { useTeamChat } from './useTeamChat';

/**
 * Hook for message actions: reactions, delete, and edit
 */
export function useMessageActions() {
  const [isPending, setIsPending] = useState(false);
  const {
    addMessageReaction,
    removeMessageReaction,
    messageReactions,
    removeMessage,
    removeDirectMessage,
    updateMessage,
  } = useTeamChat();

  /**
   * Add emoji reaction — optimistic update
   */
  const addReaction = async (messageId: string, emoji: string, userId: string) => {
    // Optimistic: add a temp reaction
    const tempId = `temp-${Date.now()}`;
    const tempReaction: MessageReaction = {
      id: tempId,
      messageId,
      userId,
      emoji,
      createdAt: new Date().toISOString(),
    };
    addMessageReaction(messageId, tempReaction);

    try {
      const real: MessageReaction = await apiClient.addTeamChatReaction(messageId, emoji);
      removeMessageReaction(messageId, tempId);
      addMessageReaction(messageId, real);
    } catch (error: any) {
      removeMessageReaction(messageId, tempId);
      toast.error(error?.message || 'Failed to add reaction');
    }
  };

  /**
   * Remove emoji reaction
   */
  const removeReaction = async (
    messageId: string,
    emoji: string,
    reactionId: string
  ) => {
    // Optimistic remove
    removeMessageReaction(messageId, reactionId);

    try {
      await apiClient.removeTeamChatReaction(messageId, emoji);
    } catch {
      toast.error('Failed to remove reaction');
    }
  };

  /**
   * Delete a channel message
   */
  const deleteMessage = async (
    messageId: string,
    channelId: string
  ) => {
    setIsPending(true);
    // Optimistic remove
    removeMessage(channelId, messageId);
    try {
      await apiClient.deleteTeamChatMessage(messageId);
    } catch {
      toast.error('Failed to delete message');
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Delete a direct message
   */
  const deleteDirectMessage = async (
    messageId: string,
    otherUserId: string
  ) => {
    setIsPending(true);
    removeDirectMessage(otherUserId, messageId);
    try {
      await apiClient.deleteTeamChatDirectMessage(messageId);
    } catch {
      toast.error('Failed to delete message');
    } finally {
      setIsPending(false);
    }
  };

  /**
   * Edit a channel message — optimistic update, then confirm from server.
   * DM editing is out of scope: no backend endpoint exists for DirectMessage edits.
   */
  const editMessage = async (
    messageId: string,
    channelId: string,
    contentPlain: string
  ) => {
    const content: TiptapContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: contentPlain }] }],
    };

    updateMessage(channelId, messageId, {
      content,
      contentPlain,
      editedAt: new Date().toISOString(),
    });

    try {
      const updated = await apiClient.editTeamChatMessage(messageId, { content });
      updateMessage(channelId, messageId, updated);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to edit message');
    }
  };

  return {
    isPending,
    messageReactions,
    addReaction,
    removeReaction,
    deleteMessage,
    deleteDirectMessage,
    editMessage,
  };
}
