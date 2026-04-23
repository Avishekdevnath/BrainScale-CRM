import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TiptapContent } from '@/types/team-chat.types';

const sendDirectMessageMock = vi.hoisted(() => vi.fn());
const useTeamChatMock = vi.hoisted(() => vi.fn());
const useChannelsMock = vi.hoisted(() => vi.fn());
const useMessagesMock = vi.hoisted(() => vi.fn());
const useDirectMessagesMock = vi.hoisted(() => vi.fn());
const useNotificationsMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useTeamChat: useTeamChatMock,
  useChannels: useChannelsMock,
  useMessages: useMessagesMock,
  useDirectMessages: useDirectMessagesMock,
  useNotifications: useNotificationsMock,
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

vi.mock('./components/ActivityFeedView', () => ({
  default: () => <div>activity</div>,
}));

vi.mock('./components/MessageView', () => ({
  default: ({ onSendMessage }: { onSendMessage?: (content: TiptapContent, mentionedUsers?: string[]) => Promise<void> }) => (
    <button
      type="button"
      onClick={() =>
        onSendMessage?.(
          { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
          ['mentioned-user']
        )
      }
    >
      Trigger Send
    </button>
  ),
}));

import TeamChatPage from './page';

describe('TeamChatPage direct-message send wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useTeamChatMock.mockReturnValue({
      currentView: { type: 'direct-message', userId: 'recipient-1' },
    });
    useChannelsMock.mockReturnValue({ channels: [] });
    useMessagesMock.mockReturnValue({
      messages: [],
      refetch: vi.fn(),
    });
    useDirectMessagesMock.mockReturnValue({
      messages: [],
      sendDirectMessage: sendDirectMessageMock,
    });
    useNotificationsMock.mockReturnValue({
      notifications: [],
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    sendDirectMessageMock.mockResolvedValue(undefined);
  });

  it('calls the direct-message hook send function when composing a DM', async () => {
    render(<TeamChatPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Send' }));

    await waitFor(() => {
      expect(sendDirectMessageMock).toHaveBeenCalledWith(
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Hello' }],
            },
          ],
        },
        ['mentioned-user']
      );
    });

    expect(toastMock.success).toHaveBeenCalledWith('Message sent');
  });
});
