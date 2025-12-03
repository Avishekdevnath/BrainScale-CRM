// Batch API Types - Backend Response Structures

export interface Batch {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  startDate?: string | null; // ISO 8601
  endDate?: string | null; // ISO 8601
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    groups: number;
    studentBatches: number;
  };
}

export interface BatchWithCounts extends Batch {
  _count: {
    groups: number;
    studentBatches: number;
  };
}

export interface BatchListParams {
  page?: number;
  size?: number;
  isActive?: boolean;
}

export interface BatchListResponse {
  batches: Batch[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateBatchPayload {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateBatchPayload {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface BatchStatsResponse {
  batch: {
    id: string;
    name: string;
  };
  counts: {
    groups: number;
    students: number;
    enrollments: number;
    calls: number;
    followups: number;
  };
}

export interface StudentBatch {
  id: string;
  studentId: string;
  batchId: string;
  createdAt: string;
  batch?: {
    id: string;
    name: string;
    description?: string | null;
    isActive: boolean;
  };
}

export interface AddStudentToBatchPayload {
  batchId: string;
}

export interface SetStudentBatchesPayload {
  batchIds: string[];
}

