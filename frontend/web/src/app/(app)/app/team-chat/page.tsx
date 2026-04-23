'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import {
  useTeamChat,
  useChannels,
  useMessages,
  useDirectMessages,
  useNotifications,
} from './hooks';
import MessageView from './components/MessageView';
import ActivityFeedView from './components/ActivityFeedView';
import { apiClient } from '@/lib/api-client';
import type { TiptapContent } from '@/types/team-chat.types';

export default function TeamChatPage() {
  const { currentView, activeDmUser } = useTeamChat();
  const workspaceLoaded = !!useWorkspaceStore((state) => state.current?.id);
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';

  const { channels } = useChannels({ enabled: workspaceLoaded });
  const { messages, refetch: refetchMessages } = useMessages({
    channelId: currentView.type === 'channel' ? currentView.channelId : undefined,
    enabled: currentView.type === 'channel' && workspaceLoaded,
  });
  const { messages: directMessages, sendDirectMessage } = useDirectMessages({
    userId: currentView.type === 'direct-message' ? currentView.userId : undefined,
    enabled: currentView.type === 'direct-message' && workspaceLoaded,
  });
  const { notifications, markAsRead, markAllAsRead } = useNotifications({ enabled: workspaceLoaded });

  useEffect(() => {}, []);

  const handleSendMessage = async (content: TiptapContent, mentionedUsers?: string[]) => {
    if (currentView.type === 'direct-message') {
      try {
        console.log('[handleSendMessage] Sending DM to:', currentView.userId);
        await sendDirectMessage(content, mentionedUsers);
        console.log('[handleSendMessage] DM sent successfully');
        toast.success('Message sent');
      } catch (err: any) {
        console.error('[handleSendMessage] DM error:', err);
        toast.error(err?.message || 'Failed to send message');
      }
      return;
    }

    if (currentView.type === 'channel' && currentView.channelId) {
      try {
        console.log('[handleSendMessage] Sending to channel:', currentView.channelId);
        await apiClient.sendTeamChatMessage({
          channelId: currentView.channelId,
          content,
          mentionedUsers: mentionedUsers ?? [],
        });
        console.log('[handleSendMessage] Message sent, now refetching...');
        // Refetch messages immediately
        await refetchMessages();
        console.log('[handleSendMessage] Refetch completed');
        toast.success('Message sent');
      } catch (err: any) {
        console.error('[handleSendMessage] Channel error:', err);
        toast.error(err?.message || 'Failed to send message');
      }
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--groups1-background)]">
      {currentView.type === 'activity' && (
        <ActivityFeedView
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
      {currentView.type === 'channel' && currentView.channelId && (
        <MessageView
          type="channel"
          channelId={currentView.channelId}
          channel={channels.find((c) => c.id === currentView.channelId)}
          messages={messages}
          onRefresh={refetchMessages}
          onSendMessage={handleSendMessage}
          currentUserId={currentUserId}
        />
      )}
      {currentView.type === 'direct-message' && currentView.userId && (
        <MessageView
          type="direct-message"
          userId={currentView.userId}
          messages={directMessages}
          onSendMessage={handleSendMessage}
          currentUserId={currentUserId}
          dmRecipient={
            activeDmUser?.id === currentView.userId
              ? { id: activeDmUser.id, name: activeDmUser.name, email: activeDmUser.email }
              : undefined
          }
        />
      )}
    </div>
  );
}
