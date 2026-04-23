'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquarePlus, Search, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspace';
import { useWorkspaceMembers } from '@/hooks/useMembers';

interface NewDirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: { id: string; name: string; email: string }) => void;
}

function initialsFromName(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split('@')[0] || 'U';
  return source
    .split(/\s+|\./)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || 'U';
}

export default function NewDirectMessageDialog({
  open,
  onOpenChange,
  onSelect,
}: NewDirectMessageDialogProps) {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { members, isLoading } = useWorkspaceMembers(open ? workspaceId : null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = m.user?.name?.toLowerCase() || '';
      const email = m.user?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [members, query]);

  const handleSelect = (userId: string, name: string, email: string) => {
    onSelect({ id: userId, name, email });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-[var(--groups1-border)]">
          <DialogClose onClose={() => onOpenChange(false)} />
          <DialogHeader className="mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--groups1-primary)]/15 text-[var(--groups1-primary)]">
                <MessageSquarePlus className="w-5 h-5" />
              </span>
              <DialogTitle>New direct message</DialogTitle>
            </div>
            <p className="text-sm text-[var(--groups1-text-secondary)] pl-[46px]">
              Pick a teammate from your workspace to start a private conversation.
            </p>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)] pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              autoFocus
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-[var(--groups1-text-secondary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] mb-2">
                <UserPlus className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">
                {query ? 'No teammates match' : 'No teammates found'}
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                {query
                  ? 'Try a different name or email.'
                  : 'Invite members from the workspace settings to start DMing.'}
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((m) => {
                const name = m.user?.name || m.user?.email.split('@')[0] || 'Unknown';
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(m.userId, m.user?.name || m.user?.email?.split('@')[0] || 'Unknown', m.user?.email || '')}
                      className={cn(
                        'w-full flex items-center gap-3 px-6 py-2.5 text-left transition-colors',
                        'hover:bg-[var(--groups1-secondary)]'
                      )}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                        aria-hidden
                      >
                        {initialsFromName(m.user?.name, m.user?.email || '')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--groups1-text)] truncate">
                          {name}
                        </div>
                        <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                          {m.user?.email}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                        {m.role}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[var(--groups1-border)] bg-[var(--groups1-background)] flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
