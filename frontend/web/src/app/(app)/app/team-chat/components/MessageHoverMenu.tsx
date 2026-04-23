'use client';

import { useState } from 'react';
import { Smile, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';

interface MessageHoverMenuProps {
  messageId: string;
  isOwn: boolean;
  currentUserId: string;
  onReact: (messageId: string, emoji: string, userId: string) => void;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  className?: string;
}

export function MessageHoverMenu({
  messageId,
  isOwn,
  currentUserId,
  onReact,
  onDelete,
  onEdit,
  className,
}: MessageHoverMenuProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5',
        className
      )}
    >
      {/* Emoji reaction button */}
      <div className="relative">
        <button
          type="button"
          title="React"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Smile size={15} />
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-1 z-50">
            <EmojiPicker
              onSelect={(emoji) => {
                onReact(messageId, emoji, currentUserId);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Edit button — only for own messages */}
      {isOwn && (
        <button
          type="button"
          title="Edit message"
          onClick={() => onEdit(messageId)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Pencil size={15} />
        </button>
      )}

      {/* Delete button — only for own messages */}
      {isOwn && (
        <button
          type="button"
          title="Delete message"
          onClick={() => onDelete(messageId)}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
