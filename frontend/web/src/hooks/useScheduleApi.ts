import { useState } from 'react';
import {
  ScheduleTemplateResponse,
  ScheduleChange,
} from '@/types/schedule.types';

const API_BASE = '/api/v1/schedule';

export function useScheduleApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch schedule template
  const fetchTemplate = async (
    templateId?: string,
  ): Promise<ScheduleTemplateResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const url = templateId ? `${API_BASE}/template/${templateId}` : `${API_BASE}/template`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Submit bulk changes
  const submitBulkChanges = async (
    templateId: string,
    changes: ScheduleChange[],
  ): Promise<{ success: boolean; updatedTemplate?: ScheduleTemplateResponse; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/template/${templateId}/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save schedule');
      }

      const data = await response.json();
      return {
        success: true,
        updatedTemplate: data,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return {
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    fetchTemplate,
    submitBulkChanges,
  };
}
