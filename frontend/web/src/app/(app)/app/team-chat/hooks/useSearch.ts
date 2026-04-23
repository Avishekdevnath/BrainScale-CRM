'use client';

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type { SearchResults } from '@/types/team-chat.types';

/**
 * Hook for searching team chat messages and channels
 */
export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ messages: [], channels: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ messages: [], channels: [] });
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const data: SearchResults = await apiClient.searchTeamChat(q.trim(), 20);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }, [search]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({ messages: [], channels: [] });
    setError(null);
  }, []);

  return {
    query,
    results,
    isSearching,
    error,
    handleQueryChange,
    clearSearch,
  };
}
