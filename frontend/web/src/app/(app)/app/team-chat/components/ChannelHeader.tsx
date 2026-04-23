'use client';

import { RefreshCw, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatHeader from './ChatHeader';
import type { Channel } from '@/types/team-chat.types';

interface ChannelHeaderProps {
  channel: Channel;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onOpenMembers?: () => void;
  onMenuClick?: () => void;
}

export default function ChannelHeader({
  channel,
  onRefresh,
  onOpenSettings,
  onOpenMembers,
  onMenuClick,
}: ChannelHeaderProps) {
  const memberCount = channel.members?.length || 0;
  const prefix = channel.type === 'resources' ? '🔒 ' : '# ';

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenMembers}
        disabled={!onOpenMembers}
        className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
      >
        <Users className="w-4 h-4 mr-2" />
        {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
      </Button>
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenSettings}
        disabled={!onOpenSettings}
        className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
    </>
  );

  return (
    <ChatHeader
      title={`${prefix}${channel.name}`}
      subtitle={channel.description}
      actions={actions}
      onMenuClick={onMenuClick}
    />
  );
}
