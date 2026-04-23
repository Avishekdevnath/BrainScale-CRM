'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/types/team-chat.types';
import { EmojiPicker } from './EmojiPicker';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  currentUserId: string;
  onAdd: (messageId: string, emoji: string, userId: string) => void;
  onRemove: (messageId: string, emoji: string, reactionId: string) => void;
  className?: string;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  reactionId?: string; // the current user's reaction id, if any
  hasCurrentUser: boolean;
}

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAdd,
  onRemove,
  className,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group by emoji
  const grouped: Record<string, GroupedReaction> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, count: 0, hasCurrentUser: false };
    }
    grouped[r.emoji].count++;
    if (r.userId === currentUserId) {
      grouped[r.emoji].hasCurrentUser = true;
      grouped[r.emoji].reactionId = r.id;
    }
  }

  const groups = Object.values(grouped);

  if (groups.length === 0 && !showPicker) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1 mt-1', className)}>
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => {
            if (g.hasCurrentUser && g.reactionId) {
              onRemove(messageId, g.emoji, g.reactionId);
            } else {
              onAdd(messageId, g.emoji, currentUserId);
            }
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors',
            g.hasCurrentUser
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          )}
        >
          <span>{g.emoji}</span>
          <span className="text-xs font-medium">{g.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded-full border border-transparent hover:border-gray-200 text-sm transition-colors"
          title="Add reaction"
        >
          +😊
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 z-50">
            <EmojiPicker
              onSelect={(emoji) => {
                onAdd(messageId, emoji, currentUserId);
                setShowPicker(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
