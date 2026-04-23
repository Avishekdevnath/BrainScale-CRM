'use client';

import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import MessageView from '../../components/MessageView';
import { apiClient } from '@/lib/api-client';
import type { TiptapContent } from '@/types/team-chat.types';
import type { ChatUser } from '@/types/team-chat.types';

interface DMPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default function DMPage({ params }: DMPageProps) {
  const { userId: recipientId } = use(params);
  const workspaceLoaded = !!useWorkspaceStore((state) => state.current?.id);
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';
  const [dmRecipient, setDmRecipient] = useState<ChatUser | undefined>();
  const [isLoadingRecipient, setIsLoadingRecipient] = useState(true);

  const { messages: directMessages, sendDirectMessage, refetch: refetchMessages } = useDirectMessages({
    userId: recipientId,
    enabled: workspaceLoaded && !!recipientId,
  });

  // Fetch recipient user info from workspace members
  useEffect(() => {
    if (!recipientId || !workspaceLoaded) return;

    const fetchRecipient = async () => {
      try {
        const workspaceId = useWorkspaceStore.getState().current?.id;
        if (!workspaceId) return;

        console.log(`[DM-PAGE] Fetching user info for: ${recipientId}`);
        const members = await apiClient.getWorkspaceMembers(workspaceId);
        const member = members.find((m) => m.user.id === recipientId);

        if (member) {
          setDmRecipient({
            id: member.user.id,
            name: member.user.name || 'Unknown',
            email: member.user.email,
          });
          console.log(`[DM-PAGE] Loaded recipient: ${member.user.name}`);
        }
        setIsLoadingRecipient(false);
      } catch (err) {
        console.error(`[DM-PAGE] Failed to fetch user info:`, err);
        setIsLoadingRecipient(false);
      }
    };

    fetchRecipient();
  }, [recipientId, workspaceLoaded]);

  const handleSendMessage = async (content: TiptapContent, mentionedUsers?: string[]) => {
    try {
      console.log(`[DM-PAGE] Sending DM to: ${recipientId}`);
      await sendDirectMessage(content, mentionedUsers);
      console.log(`[DM-PAGE] DM sent successfully`);
      toast.success('Message sent');
    } catch (err: any) {
      console.error(`[DM-PAGE] Error sending DM:`, err);
      toast.error(err?.message || 'Failed to send message');
    }
  };

  // Extract recipient info from the first message if available
  useEffect(() => {
    if (directMessages.length > 0) {
      const firstMsg = directMessages[0];
      if ('sender' in firstMsg && 'recipient' in firstMsg) {
        const isCurrentUserSender = firstMsg.sender?.id === currentUserId;
        const recipient = isCurrentUserSender ? firstMsg.recipient : firstMsg.sender;
        if (recipient) {
          setDmRecipient({
            id: recipient.id,
            name: recipient.name || 'Unknown',
            email: recipient.email,
          });
        }
      }
    }
  }, [directMessages, currentUserId]);

  if (!workspaceLoaded) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <MessageView
      type="direct-message"
      userId={recipientId}
      messages={directMessages}
      onSendMessage={handleSendMessage}
      currentUserId={currentUserId}
      dmRecipient={dmRecipient}
      isLoading={isLoadingRecipient}
      onRefresh={refetchMessages}
    />
  );
}
