'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bell, Hash, Lock, MessageSquarePlus, Plus, Menu, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/useLogout';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { useTeamChat } from '../hooks/useTeamChat';
import { useChannels } from '../hooks/useChannels';
import { useNotifications } from '../hooks/useNotifications';
import { useDirectMessagesList } from '../hooks/useDirectMessagesList';
import CreateChannelDialog from './CreateChannelDialog';
import NewDirectMessageDialog from './NewDirectMessageDialog';
import { SearchBar } from './SearchBar';
import type { Channel } from '@/types/team-chat.types';

export interface TeamChatSidebarProps {
  mode?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export default function TeamChatSidebar({ mode = 'desktop', onNavigate }: TeamChatSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const logout = useLogout();
  const workspaceName = useWorkspaceStore((state) => state.getCurrentName());
  const workspaceLoaded = !!useWorkspaceStore((state) => state.current?.id);
  const hasAuth = !!useAuthStore((state) => state.accessToken);
  // Only fire authed polling once BOTH auth and workspace are present. If auth is
  // cleared mid-session (refresh failed → AuthGuard redirecting), this flips false
  // and all polling stops cleanly instead of hammering the API with 401s.
  const pollingEnabled = hasAuth && workspaceLoaded;
  const { currentView, setCurrentView, unreadCounts, activeDmUser, setActiveDmUser } = useTeamChat();
  const { channels, createChannel } = useChannels({ enabled: pollingEnabled });
  const { notifications } = useNotifications({ enabled: pollingEnabled });
  const { dmConversations } = useDirectMessagesList({ enabled: pollingEnabled });

  const unreadByChannel = unreadCounts?.channels || {};
  const notificationsCount = notifications.filter((n) => !n.isRead).length;

  const defaultChannels = useMemo(
    () => channels.filter((c) => c.type === 'main' || c.type === 'resources'),
    [channels]
  );
  const customChannels = useMemo(
    () => channels.filter((c) => c.type === 'custom'),
    [channels]
  );

  const isActiveChannel = (channelId: string) =>
    currentView.type === 'channel' && currentView.channelId === channelId;
  const isActivity = currentView.type === 'activity';

  const handleSelectChannel = (channelId: string) => {
    setCurrentView({ type: 'channel', channelId });
    onNavigate?.();
  };
  const handleSelectActivity = () => {
    setCurrentView({ type: 'activity' });
    onNavigate?.();
  };
  const handleOpenCreateChannel = () => setCreateChannelOpen(true);
  const handleCreateChannel = async ({
    name,
    description,
  }: {
    name: string;
    description?: string;
  }) => {
    await createChannel(name, description);
    toast.success('Channel created');
  };
  const handleOpenNewDm = () => setNewDmOpen(true);
  const handleSelectDmUser = (user: { id: string; name: string; email: string }) => {
    setActiveDmUser(user);
    router.push(`/app/team-chat/dm/${user.id}`);
    onNavigate?.();
  };

  const renderChannelRow = (channel: Channel) => {
    const active = isActiveChannel(channel.id);
    const unread = unreadByChannel[channel.id] || 0;
    const Icon = channel.type === 'resources' ? Lock : Hash;
    const isCurrentPage = typeof window !== 'undefined' && window.location.pathname === `/app/team-chat/channel/${channel.id}`;

    return (
      <Link
        key={channel.id}
        href={`/app/team-chat/channel/${channel.id}`}
        onClick={onNavigate}
        title={collapsed ? channel.name : undefined}
        className={cn(
          'group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left',
          isCurrentPage
            ? 'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]'
            : 'text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{channel.name}</span>
            {unread > 0 && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  isCurrentPage
                    ? 'bg-[var(--groups1-btn-primary-text)]/20 text-[var(--groups1-btn-primary-text)]'
                    : 'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]'
                )}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        mode === 'desktop'
          ? 'hidden md:flex h-screen'
          : 'flex h-full w-72 max-w-[85vw]',
        'flex-col border-r bg-[var(--groups1-surface)] border-[var(--groups1-border)] transition-all duration-250',
        mode === 'desktop' && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      <div className="p-4 border-b border-[var(--groups1-border)] flex-shrink-0">
        <Link
          href="/app"
          className="flex items-center gap-3 transition-all hover:brightness-95"
          onClick={onNavigate}
        >
          <Image
            src="/assets/logo.png"
            alt="BrainScale CRM"
            width={32}
            height={32}
            className="flex-shrink-0 w-8 h-8 object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="text-base font-bold text-[var(--groups1-text)] truncate">
                Team Chat
              </div>
              <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                {workspaceName}
              </div>
            </div>
          )}
        </Link>
      </div>

      {!collapsed && (
        <div className="px-3 pt-2 pb-1 border-b border-[var(--groups1-border)] flex-shrink-0">
          <SearchBar />
        </div>
      )}

      <div className="p-2 border-b border-[var(--groups1-border)] flex-shrink-0 space-y-1">
        <Button
          onClick={handleOpenCreateChannel}
          className={cn(
            'w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:opacity-90 gap-2',
            collapsed && 'px-2'
          )}
          size="sm"
          title={collapsed ? 'New Channel' : undefined}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>New Channel</span>}
        </Button>
        {!collapsed && (
          <Button
            onClick={handleOpenNewDm}
            variant="outline"
            size="sm"
            className="w-full gap-2 text-[var(--groups1-text)] border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
          >
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            <span>New Direct Message</span>
          </Button>
        )}
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <button
          type="button"
          onClick={handleSelectActivity}
          title={collapsed ? 'Activity Feed' : undefined}
          className={cn(
            'group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors mb-3',
            isActivity
              ? 'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]'
              : 'text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]',
            collapsed && 'justify-center px-2'
          )}
        >
          <Bell className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Activity Feed</span>
              {notificationsCount > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    isActivity
                      ? 'bg-[var(--groups1-btn-primary-text)]/20 text-[var(--groups1-btn-primary-text)]'
                      : 'bg-red-500 text-white'
                  )}
                >
                  {notificationsCount > 99 ? '99+' : notificationsCount}
                </span>
              )}
            </>
          )}
        </button>

        {!collapsed && (
          <div className="flex items-center justify-between px-2.5 mt-2 mb-1.5">
            <span className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">
              Channels
            </span>
            <button
              type="button"
              onClick={handleOpenCreateChannel}
              aria-label="Create channel"
              className="p-1 rounded hover:bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="space-y-0.5 mb-3">
          {defaultChannels.map(renderChannelRow)}
          {customChannels.map(renderChannelRow)}
          {channels.length === 0 && !collapsed && (
            <div className="px-2.5 py-2 text-xs text-[var(--groups1-text-secondary)]">
              No channels yet.
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center justify-between px-2.5 mt-3 mb-1.5">
            <span className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider">
              Direct Messages
            </span>
            <button
              type="button"
              onClick={handleOpenNewDm}
              aria-label="Start direct message"
              className="p-1 rounded hover:bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {!collapsed && (() => {
          const activeDmUserId = currentView.type === 'direct-message' ? currentView.userId : undefined;
          // Check if active DM user is already in the conversations list
          const activeInList = dmConversations.some((c) => c.userId === activeDmUserId);
          // Show ephemeral entry if we're in a DM that's not yet in the list
          const showEphemeral = activeDmUserId && !activeInList && activeDmUser?.id === activeDmUserId;

          const isEmpty = dmConversations.length === 0 && !showEphemeral;

          return (
            <div className="space-y-0.5">
              {isEmpty && (
                <div className="px-2.5 py-2 flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>No conversations yet.</span>
                </div>
              )}

              {/* Ephemeral active entry — new DM not yet in list */}
              {showEphemeral && (
                <Link
                  key="ephemeral"
                  href={`/app/team-chat/dm/${activeDmUser!.id}`}
                  onClick={onNavigate}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 bg-[var(--groups1-btn-primary-text)]/20">
                    {(activeDmUser!.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{activeDmUser!.name}</span>
                </Link>
              )}

              {dmConversations.map((conv) => {
                const isCurrentPage = typeof window !== 'undefined' && window.location.pathname === `/app/team-chat/dm/${conv.userId}`;
                return (
                  <Link
                    key={conv.userId}
                    href={`/app/team-chat/dm/${conv.userId}`}
                    onClick={onNavigate}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors text-left',
                      isCurrentPage
                        ? 'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]'
                        : 'text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]'
                    )}
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 bg-[var(--groups1-primary)]/20 text-[var(--groups1-primary)]">
                      {(conv.user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{conv.user.name}</span>
                    {conv.unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })()}
      </nav>

      <div className="p-2 border-t border-[var(--groups1-border)] space-y-1 flex-shrink-0">
        {mode === 'desktop' && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all',
              'text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]'
            )}
          >
            <Menu className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all',
            'text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        onCreate={handleCreateChannel}
      />
      <NewDirectMessageDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        onSelect={(user) => handleSelectDmUser(user)}
      />
    </aside>
  );
}
