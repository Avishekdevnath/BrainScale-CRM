import { http, buildQueryString } from "./http";
import type { ListFollowupsParams, FollowupsListResponse } from "@/types/followups.types";

export const groupsApi = {
  getGroups(params?: { batchId?: string; isActive?: boolean }) {
    const queryString = buildQueryString({
      batchId: params?.batchId,
      isActive: params?.isActive,
    });
    return http.request<
      Array<{
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
        };
      }>
    >(`/groups${queryString}`, {
      method: "GET",
    });
  },

  createGroup(data: { name: string; isActive?: boolean; batchId?: string | null }) {
    return http.request<{
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
      };
    }>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getGroupById(groupId: string) {
    return http.request<{
      id: string;
      name: string;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        enrollments: number;
        calls: number;
        followups: number;
        callLists: number;
      };
    }>(`/groups/${groupId}`, {
      method: "GET",
    });
  },

  updateGroup(groupId: string, data: { name?: string; isActive?: boolean; batchId?: string | null }) {
    return http.request<{
      id: string;
      name: string;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        enrollments: number;
        calls: number;
        followups: number;
      };
    }>(`/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteGroup(groupId: string) {
    return http.request<{
      message: string;
    }>(`/groups/${groupId}`, {
      method: "DELETE",
    });
  },

  getGroupCalls(
    groupId: string,
    params?: {
      page?: number;
      size?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
    return http.request<{
      calls: Array<{
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
      }>;
      pagination: {
        page: number;
        size: number;
        total: number;
        totalPages: number;
      };
    }>(`/groups/${groupId}/calls${queryString}`, {
      method: "GET",
    });
  },

  getGroupFollowups(
    groupId: string,
    params?: Pick<
      ListFollowupsParams,
      "page" | "size" | "status" | "assignedTo" | "startDate" | "endDate" | "callListId"
    >
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      status: params?.status,
      assignedTo: params?.assignedTo,
      startDate: params?.startDate,
      endDate: params?.endDate,
      callListId: params?.callListId,
    });
    return http.request<FollowupsListResponse>(`/groups/${groupId}/followups${queryString}`, {
      method: "GET",
    });
  },
};
