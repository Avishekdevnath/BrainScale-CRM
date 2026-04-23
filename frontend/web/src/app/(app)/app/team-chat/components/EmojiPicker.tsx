'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const EMOJI_LIST = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '👏', '🙌', '💯', '✅',
  '🤔', '👀', '🚀', '💪', '🙏', '😊',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 p-2 rounded-lg border bg-white shadow-md w-48',
        className
      )}
    >
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
