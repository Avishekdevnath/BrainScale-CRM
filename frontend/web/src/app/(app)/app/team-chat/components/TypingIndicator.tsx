'use client';

import type { TypingStatus } from '@/types/team-chat.types';

interface TypingIndicatorProps {
  typingUsers: TypingStatus[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers
    .map((t) => t.typingUser?.name || 'Someone')
    .slice(0, 3);

  let text = '';
  if (names.length === 1) {
    text = `${names[0]} is typing…`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing…`;
  } else {
    text = `${names[0]}, ${names[1]} and others are typing…`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-500">
      <span className="flex gap-0.5">
        <span className="animate-bounce [animation-delay:0ms]">·</span>
        <span className="animate-bounce [animation-delay:150ms]">·</span>
        <span className="animate-bounce [animation-delay:300ms]">·</span>
      </span>
      <span>{text}</span>
    </div>
  );
}
