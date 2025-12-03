"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type {
  CallList,
  CallListItem,
  CallListsListParams,
  CallListsListResponse,
  CallListItemsListParams,
  CallListItemsListResponse,
} from "@/types/call-lists.types";

export function useCallLists(params?: CallListsListParams) {
  const key = params
    ? `call-lists-${JSON.stringify(params)}`
    : "call-lists";
  
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
  return useSWR<CallList | null>(
    listId ? `call-list-${listId}` : null,
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
  const key = listId
    ? `call-list-items-${listId}-${JSON.stringify(params || {})}`
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

