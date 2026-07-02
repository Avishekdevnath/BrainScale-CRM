import { http, buildQueryString } from "./http";
import type {
  CallLog,
  CreateCallLogRequest,
  UpdateCallLogRequest,
  CallLogsResponse,
  CallLogStats,
  GetCallLogsParams,
  GetMyCallsParams,
  MyCallsResponse,
  MyCallsStats,
  GetMyCallHistoryParams,
} from "@/types/call-lists.types";

export const callsApi = {
  getMyCalls(params?: GetMyCallsParams): Promise<MyCallsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      groupId: params?.groupId,
      callListId: params?.callListId,
      state: params?.state,
      states: params?.states,
      followUpRequired: params?.followUpRequired,
    });
    return http.request<MyCallsResponse>(`/my-calls${queryString}`, {
      method: "GET",
    });
  },

  getAllCalls(params?: GetMyCallsParams): Promise<MyCallsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      groupId: params?.groupId,
      callListId: params?.callListId,
      state: params?.state,
      states: params?.states,
      followUpRequired: params?.followUpRequired,
      assignedTo: params?.assignedTo,
    });
    return http.request<MyCallsResponse>(`/my-calls/all${queryString}`, {
      method: "GET",
    });
  },

  getMyCallsStats(): Promise<MyCallsStats> {
    return http.request<MyCallsStats>("/my-calls/stats", {
      method: "GET",
    });
  },

  getMyCallHistory(params?: GetMyCallHistoryParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      callListId: params?.callListId,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
    return http.request<CallLogsResponse>(`/my-calls/history${queryString}`, {
      method: "GET",
    });
  },

  createCallLog(payload: CreateCallLogRequest) {
    return http.request<CallLog>("/call-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getCallLog(logId: string) {
    return http.request<CallLog>(`/call-logs/${logId}`, {
      method: "GET",
    });
  },

  updateCallLog(logId: string, payload: UpdateCallLogRequest) {
    return http.request<CallLog>(`/call-logs/${logId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // Call Draft methods (server-synced drafts of in-progress call submissions)
  listCallDrafts(params?: { callListId?: string }) {
    const queryString = buildQueryString({ callListId: params?.callListId });
    return http.request<
      Array<{
        id: string;
        callListItemId: string;
        userId: string;
        payload: any;
        updatedAt: string;
        createdAt: string;
        callListItem?: {
          id: string;
          callListId: string;
          state: string;
          studentId: string;
          assignedTo: string | null;
        };
      }>
    >(`/call-drafts${queryString}`, { method: "GET" });
  },

  getCallDraft(itemId: string) {
    return http.request<{
      id: string;
      callListItemId: string;
      userId: string;
      payload: any;
      updatedAt: string;
      createdAt: string;
    } | null>(`/call-drafts/${itemId}`, { method: "GET" });
  },

  upsertCallDraft(itemId: string, payload: Record<string, any>) {
    return http.request<{ id: string; updatedAt: string }>(
      `/call-drafts/${itemId}`,
      {
        method: "PUT",
        body: JSON.stringify({ payload }),
      }
    );
  },

  deleteCallDraft(itemId: string) {
    return http.request<{ success: boolean }>(`/call-drafts/${itemId}`, {
      method: "DELETE",
    });
  },

  submitAllCallDrafts(params: { callListId?: string; itemIds?: string[] }) {
    return http.request<{
      total: number;
      succeeded: number;
      failed: number;
      failures: Array<{ callListItemId: string; reason: string }>;
    }>(`/call-drafts/submit-all`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  getCallLogStats(params?: Omit<GetCallLogsParams, 'page' | 'size' | 'status'>): Promise<CallLogStats> {
    const queryString = buildQueryString({
      studentId: params?.studentId,
      callListId: params?.callListId,
      assignedTo: params?.assignedTo,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
      q: params?.q,
      callNumberFrom: params?.callNumberFrom,
      callNumberTo: params?.callNumberTo,
    });
    return http.request<CallLogStats>(`/call-logs/stats${queryString}`, {
      method: "GET",
    });
  },

  getCallLogs(params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      callListId: params?.callListId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
      q: params?.q,
      callNumberFrom: params?.callNumberFrom,
      callNumberTo: params?.callNumberTo,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    });
    return http.request<CallLogsResponse>(`/call-logs${queryString}`, {
      method: "GET",
    });
  },

  getStudentCallLogs(studentId: string, params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      callListId: params?.callListId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
    });
    return http.request<CallLogsResponse>(`/call-logs/students/${studentId}/call-logs${queryString}`, {
      method: "GET",
    });
  },

  getCallListCallLogs(callListId: string, params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
    });
    return http.request<CallLogsResponse>(`/call-lists/${callListId}/call-logs${queryString}`, {
      method: "GET",
    });
  },
};
