import { http, buildQueryString } from "./http";
import type {
  CallList,
  CallListItem,
  CreateCallListPayload,
  UpdateCallListPayload,
  CallListsListParams,
  CallListsListResponse,
  CallListItemsListParams,
  CallListItemsListResponse,
  AddCallListItemsPayload,
  BulkPasteCallListRequest,
  BulkPasteCallListResponse,
  UpdateCallListItemPayload,
  AssignCallListItemsPayload,
  UnassignCallListItemsPayload,
  RemoveCallListItemsPayload,
  BulkUpdateCallListItemsPayload,
  ImportPreviewResponse,
  CommitImportRequest,
  CommitImportResponse,
  StartImportCommitResponse,
  ProcessImportCommitRequest,
  ProcessImportCommitResponse,
  BulkEmailPasteRequest,
  BulkEmailPasteResponse,
  CallStatusOption,
} from "@/types/call-lists.types";
import type { StudentsListResponse } from "@/types/students.types";

export const callListsApi = {
  createCallList(payload: CreateCallListPayload) {
    // Prepare meta object with questions if provided
    const meta: Record<string, any> = payload.meta || {};
    if (payload.questions && payload.questions.length > 0) {
      meta.questions = payload.questions;
    }

    // Prepare request payload
    const requestPayload: any = {
      name: payload.name,
      source: payload.source,
      description: payload.description,
      groupId: payload.groupId,
      batchId: payload.batchId,
      studentIds: payload.studentIds,
      studentsData: payload.studentsData,
      groupIds: payload.groupIds,
      messages: payload.messages || [],
      matchBy: payload.matchBy,
      skipDuplicates: payload.skipDuplicates,
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    };

    return http.request<CallList>("/call-lists", {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });
  },

  async getCallLists(params?: CallListsListParams): Promise<CallListsListResponse> {
    const queryString = buildQueryString({
      groupId: params?.groupId,
      batchId: params?.batchId,
      status: params?.status,
      page: params?.page,
      size: params?.size,
    });
    // API returns array directly, transform to expected response format
    const response = await http.request<CallList[]>(`/call-lists${queryString}`, {
      method: "GET",
    });
    // Transform array response to object format expected by frontend
    return {
      callLists: response,
      pagination: {
        page: params?.page || 1,
        size: params?.size || response.length,
        total: response.length,
        totalPages: 1,
      },
    };
  },

  async markCallListComplete(callListId: string): Promise<CallList> {
    return http.request<CallList>(`/call-lists/${callListId}/complete`, {
      method: "PATCH",
    });
  },

  async markCallListActive(callListId: string): Promise<CallList> {
    return http.request<CallList>(`/call-lists/${callListId}/reopen`, {
      method: "PATCH",
    });
  },

  getCallListById(listId: string) {
    return http.request<CallList>(`/call-lists/${listId}`, {
      method: "GET",
    });
  },

  // Get call list details with questions extracted from meta
  async getCallListDetails(listId: string): Promise<CallList> {
    const callList = await http.request<CallList>(`/call-lists/${listId}`, {
      method: "GET",
    });
    // The backend extracts questions from meta.questions, so we should receive them directly
    return callList;
  },

  updateCallList(listId: string, payload: UpdateCallListPayload) {
    // Prepare meta object with questions if provided
    const meta: Record<string, any> = payload.meta || {};
    if (payload.questions && payload.questions.length > 0) {
      meta.questions = payload.questions;
    }

    // Prepare request payload
    const requestPayload: any = {
      name: payload.name,
      description: payload.description,
      messages: payload.messages,
      status: payload.status,
    };

    if (Object.keys(meta).length > 0 || payload.meta) {
      requestPayload.meta = Object.keys(meta).length > 0 ? meta : payload.meta;
    }

    return http.request<CallList>(`/call-lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(requestPayload),
    });
  },

  deleteCallList(listId: string) {
    return http.request<{ message: string }>(`/call-lists/${listId}`, {
      method: "DELETE",
    });
  },

  addCallListItems(listId: string, payload: AddCallListItemsPayload) {
    return http.request<{ added: number; items: CallListItem[] }>(
      `/call-lists/${listId}/items`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  getCallListItems(listId: string, params?: CallListItemsListParams) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      state: params?.state,
      assignedTo: params?.assignedTo,
      assignment: (params as any)?.assignment,
      callLogStatus: params?.callLogStatus,
      followUpRequired: params?.followUpRequired,
      q: params?.q,
      hideDone: params?.hideDone,
    });
    return http.request<CallListItemsListResponse>(
      `/call-lists/${listId}/items${queryString}`,
      {
        method: "GET",
      }
    );
  },

  // Preview import file
  async previewCallListImport(callListId: string, file: File, signal?: AbortSignal): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return http.request<ImportPreviewResponse>(
      `/call-lists/${callListId}/import/preview`,
      {
        method: 'POST',
        body: formData,
        signal,
        // Note: Don't set Content-Type header, browser will set it with boundary
      }
    );
  },

  // Commit import with column mapping
  commitCallListImport(callListId: string, data: CommitImportRequest): Promise<CommitImportResponse> {
    return http.request<CommitImportResponse>(
      `/call-lists/${callListId}/import/commit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  startCallListImportCommit(callListId: string, data: CommitImportRequest): Promise<StartImportCommitResponse> {
    return http.request<StartImportCommitResponse>(
      `/call-lists/${callListId}/import/commit/start`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  processCallListImportCommit(callListId: string, data: ProcessImportCommitRequest): Promise<ProcessImportCommitResponse> {
    return http.request<ProcessImportCommitResponse>(
      `/call-lists/${callListId}/import/commit/process`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // Bulk paste emails to call list
  bulkPasteEmailsToCallList(callListId: string, data: BulkEmailPasteRequest): Promise<BulkEmailPasteResponse> {
    return http.request<BulkEmailPasteResponse>(
      `/call-lists/${callListId}/bulk-paste-emails`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // Create call list from bulk pasted data
  bulkPasteCallList(data: BulkPasteCallListRequest): Promise<BulkPasteCallListResponse> {
    return http.request<BulkPasteCallListResponse>(
      '/call-lists/bulk-paste',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  getAvailableStudents(
    listId: string,
    params?: {
      page?: number;
      size?: number;
      q?: string;
      batchId?: string;
      courseId?: string;
      moduleId?: string;
      status?: string;
    }
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      courseId: params?.courseId,
      moduleId: params?.moduleId,
      status: params?.status,
    });
    return http.request<StudentsListResponse>(
      `/call-lists/${listId}/available-students${queryString}`,
      {
        method: "GET",
      }
    );
  },

  updateCallListItem(itemId: string, payload: UpdateCallListItemPayload) {
    return http.request<CallListItem>(`/call-list-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteCallListItem(itemId: string) {
    return http.request<{ message: string; deletedItem: { id: string; studentName?: string } }>(
      `/call-list-items/${itemId}`,
      {
        method: "DELETE",
      }
    );
  },

  assignCallListItems(listId: string, payload: AssignCallListItemsPayload) {
    return http.request<{ message: string; assignedCount: number }>(
      `/call-lists/${listId}/items/assign`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  unassignCallListItems(listId: string, payload: UnassignCallListItemsPayload) {
    return http.request<{ message: string; unassignedCount: number }>(
      `/call-lists/${listId}/items/unassign`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  removeCallListItems(listId: string, payload: RemoveCallListItemsPayload) {
    return http.request<{ message: string; removedCount: number }>(
      `/call-lists/${listId}/items/remove`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  bulkUpdateCallListItems(listId: string, payload: BulkUpdateCallListItemsPayload) {
    return http.request<{ message: string; succeeded: number; skipped: number; items: CallListItem[] }>(
      `/call-lists/${listId}/items/bulk`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  // Call Status Options
  getCallStatusOptions() {
    return http.request<CallStatusOption[]>("/call-lists/settings/status-options", { method: "GET" });
  },

  createCallStatusOption(payload: { label: string; color?: string }) {
    return http.request<CallStatusOption>("/call-lists/settings/status-options", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateCallStatusOption(optionId: string, payload: { label?: string; color?: string; order?: number; isConnected?: boolean; polarity?: 'positive' | 'negative' | 'neutral' }) {
    return http.request<CallStatusOption>(`/call-lists/settings/status-options/${optionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteCallStatusOption(optionId: string) {
    return http.request<{ message: string }>(`/call-lists/settings/status-options/${optionId}`, {
      method: "DELETE",
    });
  },

  // Per-call-list status options (stored in meta.statusOptions)
  addCallListStatusOption(listId: string, payload: { label: string }) {
    return http.request<{ value: string; label: string; color: string }>(
      `/call-lists/${listId}/status-options`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  removeCallListStatusOption(listId: string, value: string) {
    return http.request<{ message: string }>(
      `/call-lists/${listId}/status-options/${value}`,
      { method: "DELETE" }
    );
  },

  // Per-call-list custom column methods
  listCallListColumns(listId: string) {
    return http.request<{ key: string; label: string; type: string; options?: string[] }[]>(
      `/call-lists/${listId}/columns`
    );
  },

  addCallListColumn(listId: string, payload: { label: string; shortLabel?: string; type: string; options?: string[] }) {
    return http.request<{ key: string; label: string; type: string; options?: string[] }>(
      `/call-lists/${listId}/columns`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  updateCallListColumn(listId: string, key: string, payload: { label?: string; options?: string[] }) {
    return http.request<{ key: string; label: string; type: string; options?: string[] }>(
      `/call-lists/${listId}/columns/${key}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
  },

  removeCallListColumn(listId: string, key: string) {
    return http.request<{ message: string }>(
      `/call-lists/${listId}/columns/${key}`,
      { method: "DELETE" }
    );
  },

  updateCallListItemCustom(listId: string, itemId: string, fields: Record<string, any>) {
    return http.request<{ message: string }>(
      `/call-lists/${listId}/items/${itemId}/custom`,
      { method: "PATCH", body: JSON.stringify(fields) }
    );
  },
};
