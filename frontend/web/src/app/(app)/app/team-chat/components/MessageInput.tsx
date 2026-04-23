'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { TiptapContent } from '@/types/team-chat.types';

const TiptapEditor = dynamic(
  () => import('./TiptapEditor').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--groups1-text-secondary)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading editor…
      </div>
    ),
  }
);

interface MessageInputProps {
  onSend: (content: TiptapContent, mentionedUsers?: string[]) => Promise<void>;
  placeholder?: string;
  onTyping?: () => void;
}

export default function MessageInput({
  onSend,
  placeholder = 'Send a message…',
  onTyping,
}: MessageInputProps) {
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);

  const handleSend = async (content: TiptapContent) => {
    try {
      await onSend(content, mentionedUsers.length > 0 ? mentionedUsers : undefined);
      setMentionedUsers([]);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleMentionDetected = (usernames: string[]) => {
    setMentionedUsers(usernames);
  };

  return (
    <div className="px-4 md:px-6 py-3 border-t border-[var(--groups1-border)] bg-[var(--groups1-surface)]">
      <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-background)] focus-within:border-[var(--groups1-primary)] transition-colors">
        <TiptapEditor
          onSend={handleSend}
          placeholder={placeholder}
          onMentionDetected={handleMentionDetected}
          onKeyDown={onTyping}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--groups1-text-secondary)] select-none">
        <span className="font-semibold">Enter</span> to send ·{' '}
        <span className="font-semibold">Shift+Enter</span> for new line ·{' '}
        <span className="font-semibold">@</span> to mention
      </p>
    </div>
  );
}
