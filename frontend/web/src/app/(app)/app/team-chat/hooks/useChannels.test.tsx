import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '@/store/workspace';

const getTeamChatChannelsMock = vi.hoisted(() => vi.fn());
const useTeamChatMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getTeamChatChannels: getTeamChatChannelsMock,
  },
}));

vi.mock('./useTeamChat', () => ({
  useTeamChat: useTeamChatMock,
}));

import { useChannels } from './useChannels';

describe('useChannels', () => {
  const setChannels = vi.fn();
  const addChannel = vi.fn();
  const updateChannel = vi.fn();
  const removeChannel = vi.fn();

  const channel = {
    id: 'channel-1',
    workspaceId: 'workspace-1',
    name: 'Main',
    type: 'main' as const,
    createdBy: 'user-1',
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z',
    members: [],
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.getState().setCurrent({ id: 'workspace-1', name: 'Workspace 1' });
    localStorage.setItem(
      'currentWorkspace',
      JSON.stringify({ id: 'workspace-1', name: 'Workspace 1' })
    );

    useTeamChatMock.mockReturnValue({
      channels: [],
      setChannels,
      addChannel,
      updateChannel,
      removeChannel,
    });

    getTeamChatChannelsMock.mockResolvedValue([channel]);
  });

  afterEach(() => {
    useWorkspaceStore.getState().clear();
    localStorage.clear();
  });

  it('loads channels through apiClient so team-chat uses the shared auth transport', async () => {
    renderHook(() => useChannels({ enabled: true }), { wrapper });

    await waitFor(() => {
      expect(getTeamChatChannelsMock).toHaveBeenCalledWith(undefined);
      expect(setChannels).toHaveBeenCalledWith([channel]);
    });
  });
});
