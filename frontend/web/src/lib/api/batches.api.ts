import { http, buildQueryString } from "./http";
import type {
  Batch,
  BatchListParams,
  BatchListResponse,
  CreateBatchPayload,
  UpdateBatchPayload,
  BatchStatsResponse,
  StudentBatch,
  AddStudentToBatchPayload,
  SetStudentBatchesPayload,
} from "@/types/batches.types";

export const batchesApi = {
  createBatch(payload: CreateBatchPayload) {
    return http.request<Batch>("/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listBatches(params?: BatchListParams) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      isActive: params?.isActive,
    });
    return http.request<BatchListResponse>(`/batches${queryString}`, {
      method: "GET",
    });
  },

  getBatch(batchId: string) {
    return http.request<Batch>(`/batches/${batchId}`, {
      method: "GET",
    });
  },

  updateBatch(batchId: string, payload: UpdateBatchPayload) {
    return http.request<Batch>(`/batches/${batchId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteBatch(batchId: string) {
    return http.request<{ message: string }>(`/batches/${batchId}`, {
      method: "DELETE",
    });
  },

  getBatchStats(batchId: string) {
    return http.request<BatchStatsResponse>(`/batches/${batchId}/stats`, {
      method: "GET",
    });
  },

  alignGroupsToBatch(batchId: string, groupIds: string[]) {
    return http.request<{
      updated: number;
      groups: Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>;
    }>(`/batches/${batchId}/groups`, {
      method: "POST",
      body: JSON.stringify({ groupIds }),
    });
  },

  removeGroupsFromBatch(batchId: string, groupIds: string[]) {
    return http.request<{
      removed: number;
      groups: Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string | null;
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
      }>;
    }>(`/batches/${batchId}/groups`, {
      method: "DELETE",
      body: JSON.stringify({ groupIds }),
    });
  },

  getGroupsByBatch(batchId: string) {
    return http.request<
      Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>
    >(`/batches/${batchId}/groups`, {
      method: "GET",
    });
  },

  addStudentToBatch(studentId: string, payload: AddStudentToBatchPayload) {
    return http.request<StudentBatch>(`/students/${studentId}/batches`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getStudentBatches(studentId: string) {
    return http.request<StudentBatch[]>(`/students/${studentId}/batches`, {
      method: "GET",
    });
  },

  setStudentBatches(studentId: string, payload: SetStudentBatchesPayload) {
    return http.request<{ message: string; batches: StudentBatch[] }>(
      `/students/${studentId}/batches`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  },

  removeStudentFromBatch(studentId: string, batchId: string) {
    return http.request<{ message: string }>(
      `/students/${studentId}/batches/${batchId}`,
      {
        method: "DELETE",
      }
    );
  },
};
