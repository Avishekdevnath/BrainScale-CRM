"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";

export interface Group {
  id: string;
  name: string;
  isActive: boolean;
  workspaceId: string;
  batchId?: string | null;
  batch?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
    calls: number;
    followups: number;
    callLists?: number; // Only present in getGroupById response
  };
}

export interface GroupCall {
  id: string;
  callStatus: string;
  callDate: string;
  notes: string | null;
  studentId: string;
  groupId: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GroupFollowup {
  id: string;
  status: string;
  dueAt: string;
  notes: string | null;
  studentId: string;
  groupId: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  student: {
    id: string;
    name: string;
    email: string;
  };
  creator: {
    id: string;
    name: string;
    email: string;
  };
  assignee: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
}

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface GroupCallsResponse {
  calls: GroupCall[];
  pagination: PaginationMeta;
}

export interface GroupFollowupsResponse {
  followups: GroupFollowup[];
  pagination: PaginationMeta;
}

export interface GroupsListParams {
  batchId?: string;
  isActive?: boolean;
}

export function useGroups(params?: GroupsListParams) {
  const workspaceId = useWorkspaceStore((state) => state.current?.id);

  const queryString = new URLSearchParams();
  if (params?.batchId) queryString.append("batchId", params.batchId);
  if (params?.isActive !== undefined) queryString.append("isActive", String(params.isActive));

  const cacheKey = `${workspaceId || "no-workspace"}:groups${queryString.toString() ? `?${queryString.toString()}` : ""}`;

  return useSWR<Group[]>(
    cacheKey,
    async () => apiClient.getGroups(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );
}

