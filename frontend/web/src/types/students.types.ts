// Students API Types - Backend Response Structures

import type { StudentBatch } from "./batches.types";

export interface StudentPhone {
  id: string;
  phone: string;
  isPrimary: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string | null;
  discordId?: string | null;
  tags: string[];
  phones: StudentPhone[];
  enrollments?: StudentEnrollment[];
  studentBatches?: StudentBatch[];
  createdAt: string;
}

export interface StudentGroupRef {
  id: string;
  name: string;
}

export interface StudentCourseRef {
  id: string;
  name: string;
}

export interface StudentModuleRef {
  id: string;
  name: string;
}

export interface StudentEnrollment {
  id: string;
  status?: string | null;
  isActive?: boolean;
  group?: StudentGroupRef | null;
  course?: StudentCourseRef | null;
  module?: StudentModuleRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentGroupStatus {
  id: string;
  groupId: string;
  status: StudentsListParams["status"] | string;
  group?: StudentGroupRef | null;
}

export interface StudentTimelineCall {
  id: string;
  callStatus: string;
  callDate: string;
  user?: { id: string; name: string | null };
  group?: StudentGroupRef | null;
}

export interface StudentTimelineFollowup {
  id: string;
  status: string;
  dueAt: string;
  user?: { id: string; name: string | null };
  group?: StudentGroupRef | null;
}

export interface StudentTimeline {
  calls: StudentTimelineCall[];
  followups: StudentTimelineFollowup[];
}

export interface StudentDetail extends Student {
  notes?: string | null;
  lastCallDate?: string | null;
  nextFollowUpDate?: string | null;
  averageCallDuration?: number | null;
  statuses?: StudentGroupStatus[];
  timeline?: StudentTimeline;
  _count?: {
    calls?: number;
    followups?: number;
  };
}

export interface StudentStats {
  calls: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    averageDuration: number;
    lastCallDate: string | null;
    daysSinceLastCall: number | null;
    successRate: number; // percentage
    byStatus: Record<string, number>;
  };
  followups: {
    total: number;
    pending: number;
    overdue: number;
    nextFollowUpDate: string | null;
    completionRate: number; // percentage
  };
  engagement: {
    responseRate: number;
    averageTimeBetweenCalls: number; // days
    callsPerWeek: number;
    callsPerMonth: number;
  };
}

export interface StudentPhoneInput {
  id?: string;
  phone: string;
  isPrimary?: boolean;
}

export interface StudentsListParams {
  q?: string; // Search query
  page?: number;
  size?: number;
  groupId?: string;
  courseId?: string;
  moduleId?: string;
  batchId?: string;
  status?: "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "CONVERTED" | "LOST";
}

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface StudentsListResponse {
  students: Student[];
  pagination: PaginationMeta;
}

// Bulk Paste Import Types (Old Format)
export interface BulkPasteMappingOld {
  name: string; // Required: Column name for student full name
  email?: string; // Optional: Column name for email address
  discordId?: string; // Optional: Column name for Discord ID/handle
  phone?: string; // Optional: Column name for primary phone number
  tags?: string; // Optional: Column name for comma-separated tags
}

// Bulk Paste Import Types (New Flexible Format)
export interface BulkPasteMappingFlexible {
  "student.name": string; // Required: Column name for student full name
  "student.email"?: string; // Optional: Column name for email address
  "student.discordId"?: string; // Optional: Column name for Discord ID/handle
  "student.tags"?: string; // Optional: Column name for comma-separated tags
  [key: `phone.${number}`]: string; // Indexed phones: phone.0, phone.1, etc.
  [key: `phone.${string}`]: string; // Named phones: phone.primary, phone.secondary, etc.
  "enrollment.groupName"?: string; // Optional: Column name for group name
  "enrollment.courseName"?: string; // Optional: Column name for course name
  "enrollment.status"?: string; // Optional: Column name for student status
}

// Union type for mapping - supports both old and new formats
export type BulkPasteMapping = BulkPasteMappingOld | BulkPasteMappingFlexible;

export interface BulkPasteRequest {
  rows: Array<Record<string, string>>; // Array of objects with CSV column headers as keys
  mapping: BulkPasteMapping;
  groupId?: string; // Optional: Group ID to assign all imported students to
  batchIds?: string[]; // Optional: Array of batch IDs to assign students to
  defaultStatus?: StudentsListParams["status"]; // Optional: fallback enrollment status when CSV lacks one
}

export interface BulkPasteError {
  rowIndex: number;
  message: string;
}

export interface BulkPasteResponse {
  totalRows: number;
  successCount: number;
  enrollmentSuccessCount?: number; // Only present if groupId was provided
  errorCount: number;
  errors: BulkPasteError[];
}

export interface UpdateStudentPayload {
  name?: string;
  email?: string | null;
  discordId?: string | null;
  tags?: string[];
  phones?: StudentPhoneInput[];
}

// CSV Export Types
export interface ExportCSVParams {
  groupId?: string;
  batchId?: string;
  columns?: string; // Comma-separated list of field paths
}

