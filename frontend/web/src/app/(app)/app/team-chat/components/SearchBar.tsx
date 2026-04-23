'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearch } from '../hooks/useSearch';
import { useTeamChat } from '../hooks/useTeamChat';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { query, results, isSearching, handleQueryChange, clearSearch } = useSearch();
  const { setCurrentView } = useTeamChat();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        clearSearch();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [clearSearch]);

  const hasResults =
    results.messages.length > 0 || results.channels.length > 0;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 rounded-lg',
          'border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors',
          className
        )}
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 border border-blue-300 rounded-lg px-3 py-2 bg-white shadow-sm">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search messages, channels…"
          className="flex-1 outline-none text-sm bg-transparent"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { clearSearch(); setIsOpen(false); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}

          {!isSearching && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
          )}

          {results.channels.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b">
                Channels
              </div>
              {results.channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setCurrentView({ type: 'channel', channelId: ch.id });
                    clearSearch();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-gray-500">#</span>
                  <span className="font-medium">{ch.name}</span>
                  {ch.description && (
                    <span className="text-gray-400 text-xs truncate">{ch.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.messages.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b">
                Messages
              </div>
              {results.messages.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    setCurrentView({ type: 'channel', channelId: msg.channelId });
                    clearSearch();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-700 truncate">
                    {msg.sender?.name || 'Unknown'}
                  </div>
                  <div className="text-gray-500 text-xs truncate">{msg.contentPlain}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
