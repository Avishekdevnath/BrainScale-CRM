"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type {
  CallList,
  CallListItem,
  CallListsListParams,
  CallListsListResponse,
  CallListItemsListParams,
  CallListItemsListResponse,
} from "@/types/call-lists.types";

export function useCallLists(params?: CallListsListParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = workspaceId
    ? params
      ? `${workspaceId}:call-lists-${JSON.stringify(params)}`
      : `${workspaceId}:call-lists`
    : null;
  
  return useSWR<CallListsListResponse>(
    key,
    async () => apiClient.getCallLists(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useCallList(listId: string | null | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  return useSWR<CallList | null>(
    listId && workspaceId ? `${workspaceId}:call-list-${listId}` : null,
    async () => (listId ? apiClient.getCallListById(listId) : null),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

export function useCallListItems(
  listId: string | null | undefined,
  params?: CallListItemsListParams
) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);
  const key = listId && workspaceId
    ? `${workspaceId}:call-list-items-${listId}-${JSON.stringify(params || {})}`
    : null;
  
  return useSWR<CallListItemsListResponse>(
    key,
    async () => {
      if (!listId) return null as any;
      return apiClient.getCallListItems(listId, params);
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

