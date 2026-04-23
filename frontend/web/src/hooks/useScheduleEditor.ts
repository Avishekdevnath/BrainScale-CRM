import { useState, useCallback, useRef } from 'react';
import {
  ScheduleChange,
  ScheduleEditorState,
  QueuedChange,
  ScheduleTemplateResponse,
} from '@/types/schedule.types';
import { v4 as uuidv4 } from 'uuid';

export function useScheduleEditor(initialTemplate: ScheduleTemplateResponse | null) {
  const [state, setState] = useState<ScheduleEditorState>({
    template: initialTemplate,
    queuedChanges: [],
    isLoading: false,
    isSaving: false,
    error: null,
    lastSaveTime: null,
  });

  // Track last successfully saved state (for rollback on error)
  const lastSavedStateRef = useRef<ScheduleTemplateResponse | null>(initialTemplate);

  // Add a change to the queue
  const queueChange = useCallback(
    (change: ScheduleChange, originalData?: Record<string, any>) => {
      const queuedChange: QueuedChange = {
        id: uuidv4(),
        change,
        originalData,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        queuedChanges: [...prev.queuedChanges, queuedChange],
        error: null, // Clear previous errors
      }));

      return queuedChange.id;
    },
    [],
  );

  // Remove a change from queue
  const removeChange = useCallback((changeId: string) => {
    setState((prev) => ({
      ...prev,
      queuedChanges: prev.queuedChanges.filter((c) => c.id !== changeId),
    }));
  }, []);

  // Clear all queued changes
  const clearQueue = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queuedChanges: [],
    }));
  }, []);

  // Update template (for optimistic updates)
  const updateTemplate = useCallback((template: ScheduleTemplateResponse) => {
    setState((prev) => ({
      ...prev,
      template,
    }));
  }, []);

  // Rollback to last saved state (called on API error)
  const rollback = useCallback(() => {
    setState((prev) => ({
      ...prev,
      template: lastSavedStateRef.current,
      queuedChanges: [], // Clear failed changes
    }));
  }, []);

  // Mark successful save: update lastSavedState and clear queue
  const markSaveSuccess = useCallback((newTemplate: ScheduleTemplateResponse) => {
    lastSavedStateRef.current = JSON.parse(JSON.stringify(newTemplate)); // Deep copy
    setState((prev) => ({
      ...prev,
      template: newTemplate,
      queuedChanges: [],
      lastSaveTime: Date.now(),
      error: null,
    }));
  }, []);

  // Set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading,
    }));
  }, []);

  // Set saving state
  const setSaving = useCallback((isSaving: boolean) => {
    setState((prev) => ({
      ...prev,
      isSaving,
    }));
  }, []);

  // Set error message
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  return {
    state,
    queueChange,
    removeChange,
    clearQueue,
    updateTemplate,
    rollback,
    markSaveSuccess,
    setLoading,
    setSaving,
    setError,
  };
}
