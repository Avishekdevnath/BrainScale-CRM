"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type { FormItem, FormResponseItem } from "@/types/forms.types";

export function useForms(params?: { q?: string; page?: number; size?: number }) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId
    ? `${workspaceId}:forms:${JSON.stringify(params || {})}`
    : null;

  return useSWR<FormItem[]>(
    key,
    async () => apiClient.getForms(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useForm(formId?: string | null) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId && formId ? `${workspaceId}:form:${formId}` : null;

  return useSWR<FormItem | null>(
    key,
    async () => {
      if (!formId) return null;
      return apiClient.getFormById(formId);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useFormResponses(formId?: string | null, params?: { page?: number; size?: number }) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId && formId
    ? `${workspaceId}:form-responses:${formId}:${JSON.stringify(params || {})}`
    : null;

  return useSWR<FormResponseItem[]>(
    key,
    async () => {
      if (!formId) return [];
      return apiClient.getFormResponses(formId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function usePublicForm(slug?: string | null) {
  const key = slug ? `public:form:${slug}` : null;

  return useSWR<FormItem | null>(
    key,
    async () => {
      if (!slug) return null;
      return apiClient.getPublicFormBySlug(slug);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}
