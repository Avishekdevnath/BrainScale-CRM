'use client';

import { use } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { useMessages } from '../../hooks/useMessages';
import { useChannels } from '../../hooks/useChannels';
import MessageView from '../../components/MessageView';
import { apiClient } from '@/lib/api-client';
import type { TiptapContent } from '@/types/team-chat.types';

interface ChannelPageProps {
  params: Promise<{
    channelId: string;
  }>;
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = use(params);
  const workspaceLoaded = !!useWorkspaceStore((state) => state.current?.id);
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';

  const { channels } = useChannels({ enabled: workspaceLoaded });
  const { messages, refetch: refetchMessages } = useMessages({
    channelId,
    enabled: workspaceLoaded && !!channelId,
  });

  const channel = channels.find((c) => c.id === channelId);

  const handleSendMessage = async (content: TiptapContent, mentionedUsers?: string[]) => {
    try {
      console.log(`[CHANNEL-PAGE] Sending message to: ${channelId}`);
      await apiClient.sendTeamChatMessage({
        channelId,
        content,
        mentionedUsers: mentionedUsers ?? [],
      });
      console.log(`[CHANNEL-PAGE] Message sent successfully`);
      await refetchMessages();
      toast.success('Message sent');
    } catch (err: any) {
      console.error(`[CHANNEL-PAGE] Error sending message:`, err);
      toast.error(err?.message || 'Failed to send message');
    }
  };

  if (!workspaceLoaded) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <MessageView
      type="channel"
      channelId={channelId}
      channel={channel}
      messages={messages}
      onRefresh={refetchMessages}
      onSendMessage={handleSendMessage}
      currentUserId={currentUserId}
    />
  );
}
