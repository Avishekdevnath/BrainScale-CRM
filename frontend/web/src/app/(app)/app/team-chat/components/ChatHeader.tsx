'use client';

import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onMenuClick?: () => void;
  className?: string;
}

export default function ChatHeader({
  title,
  subtitle,
  actions,
  onMenuClick,
  className,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 px-4 md:px-6 pt-4 pb-4 border-b border-[var(--groups1-border)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open sidebar"
              className="md:hidden p-2 -ml-2 -mt-1 rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
