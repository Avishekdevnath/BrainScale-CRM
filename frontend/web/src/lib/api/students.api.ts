import { http, buildQueryString } from "./http";
import type {
  StudentsListParams,
  StudentsListResponse,
  BulkPasteRequest,
  BulkPasteResponse,
  ExportCSVParams,
  StudentDetail,
  UpdateStudentPayload,
  BulkDeleteStudentsPayload,
  BulkDeleteStudentsResponse,
} from "@/types/students.types";

export const studentsApi = {
  getStudents(params?: StudentsListParams) {
    const queryString = buildQueryString({
      q: params?.q,
      page: params?.page,
      size: params?.size,
      groupId: params?.groupId,
      courseId: params?.courseId,
      moduleId: params?.moduleId,
      batchId: params?.batchId,
      status: params?.status,
    });
    return http.request<StudentsListResponse>(`/students${queryString}`, {
      method: "GET",
    });
  },

  bulkPasteStudents(data: BulkPasteRequest) {
    return http.request<BulkPasteResponse>("/students/bulk-paste", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  exportStudentsCSV(params?: ExportCSVParams) {
    const queryString = buildQueryString({
      groupId: params?.groupId,
      batchId: params?.batchId,
      columns: params?.columns,
      studentIds: params?.studentIds,
    });
    return http.requestBlob(`/students/export/csv${queryString}`, {
      method: "GET",
    });
  },

  fixBangladeshStudentPhones(): Promise<{
    message: string;
    scanned: number;
    updated: number;
    duplicatesRemoved: number;
    skipped: number;
    conflicts: number;
    conflictExamples: Array<{
      phoneId: string;
      from: string;
      to: string;
      existingStudentId: string;
    }>;
  }> {
    return http.request("/students/fix-bd-phones", {
      method: "POST",
    });
  },

  fixDuplicateStudents(): Promise<{
    message: string;
    scanned: number;
    duplicateGroups: number;
    mergedStudents: number;
  }> {
    return http.request("/students/fix-duplicates", {
      method: "POST",
    });
  },

  bulkDeleteStudents(payload: BulkDeleteStudentsPayload) {
    return http.request<BulkDeleteStudentsResponse>("/students/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getStudent(studentId: string) {
    return http.request<StudentDetail>(`/students/${studentId}`, {
      method: "GET",
    });
  },

  getStudentStats(studentId: string) {
    return http.request<import("@/types/students.types").StudentStats>(
      `/students/${studentId}/stats`,
      {
        method: "GET",
      }
    );
  },

  updateStudent(studentId: string, payload: UpdateStudentPayload) {
    return http.request<StudentDetail>(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateStudentNotes(studentId: string, notes: string) {
    return http.request<StudentDetail>(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  },

  deleteStudent(studentId: string) {
    return http.request<void>(`/students/${studentId}`, {
      method: "DELETE",
    });
  },
};
