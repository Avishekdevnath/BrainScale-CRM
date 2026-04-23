'use client';

import { useEffect, useState } from 'react';
import { Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; description?: string }) => Promise<void>;
}

export default function CreateChannelDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSubmitting(false);
    }
  }, [open]);

  const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const nameValid = sanitizedName.length >= 2 && sanitizedName.length <= 32;
  const canSubmit = nameValid && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: sanitizedName,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create channel';
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnBackdropClick={!submitting}>
      <DialogContent className="max-w-md">
        <DialogClose onClose={() => !submitting && onOpenChange(false)} />
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--groups1-primary)]/15 text-[var(--groups1-primary)]">
              <Hash className="w-5 h-5" />
            </span>
            <DialogTitle>Create a channel</DialogTitle>
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)] pl-[46px]">
            Channels are where your team talks. Keep them focused on a topic.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="channel-name"
              className="block text-sm font-medium text-[var(--groups1-text)] mb-1.5"
            >
              Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--groups1-text-secondary)] text-sm">
                #
              </span>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. product-updates"
                autoFocus
                maxLength={40}
                className="pl-7"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--groups1-text-secondary)]">
              {name ? (
                <>
                  Will appear as{' '}
                  <span className="font-semibold text-[var(--groups1-text)]">
                    #{sanitizedName || '…'}
                  </span>
                </>
              ) : (
                'Lowercase letters, numbers, and dashes only.'
              )}
            </p>
          </div>

          <div>
            <label
              htmlFor="channel-description"
              className="block text-sm font-medium text-[var(--groups1-text)] mb-1.5"
            >
              Description{' '}
              <span className="text-[var(--groups1-text-secondary)] font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
              maxLength={200}
              className={cn(
                'w-full resize-none rounded-md border border-[var(--groups1-border)]',
                'bg-[var(--groups1-background)] text-[var(--groups1-text)]',
                'placeholder:text-[var(--groups1-text-secondary)]',
                'px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]'
              )}
            />
            <div className="mt-1 flex items-center justify-end text-[11px] text-[var(--groups1-text-secondary)]">
              {description.length}/200
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--groups1-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:opacity-90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create channel'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
