// Follow-ups API Types - Backend Response Structures

export type FollowupStatus = "PENDING" | "DONE" | "SKIPPED";

export interface FollowupStudent {
  id: string;
  name: string;
  email: string | null;
  phones?: Array<{
    id?: string;
    phone: string;
    isPrimary: boolean;
  }>;
}

export interface FollowupGroup {
  id: string;
  name: string;
  batch?: {
    id: string;
    name: string;
  } | null;
}

export interface FollowupCallList {
  id: string;
  name: string;
  description: string | null;
  questions?: Array<{
    id: string;
    question: string;
    type: "text" | "yes_no" | "multiple_choice" | "number" | "date";
    options?: string[];
    required: boolean;
    order: number;
  }>;
  messages?: string[]; // Messages to convey
}

export interface FollowupPreviousCallLog {
  id: string;
  callDate: string;
  status: "completed" | "missed" | "busy" | "no_answer" | "voicemail" | "other";
  answers?: Array<{
    questionId: string;
    question: string;
    answer: string | number | boolean;
    answerType: string;
  }>;
  notes: string | null;
  callerNote: string | null;
  summaryNote: string | null;
  callDuration: number | null;
  caller?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FollowupAssignee {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Followup {
  id: string;
  studentId: string;
  groupId: string;
  callListId: string | null;
  previousCallLogId: string | null;
  assignedTo: string | null;
  dueAt: string; // ISO 8601 datetime
  status: FollowupStatus;
  notes: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations (included in API responses)
  student?: FollowupStudent;
  group?: FollowupGroup;
  callList?: FollowupCallList;
  previousCallLog?: FollowupPreviousCallLog;
  assignee?: FollowupAssignee | null;
}

export interface ListFollowupsParams {
  callListId?: string;
  status?: FollowupStatus;
  assignedTo?: string;
  groupId?: string;
  startDate?: string; // ISO 8601 datetime
  endDate?: string; // ISO 8601 datetime
  page?: number;
  size?: number;
}

export interface FollowupsListResponse {
  followups: Followup[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface FollowupCallContext {
  followup: {
    id: string;
    student: FollowupStudent;
    group: FollowupGroup;
    callList?: FollowupCallList;
    dueAt: string;
    notes: string | null;
    status: FollowupStatus;
    assignedTo?: FollowupAssignee;
  };
  callList: {
    id: string;
    name: string;
    questions: Array<{
      id: string;
      question: string;
      type: "text" | "yes_no" | "multiple_choice" | "number" | "date";
      options?: string[];
      required: boolean;
      order: number;
    }>;
    messages?: string[]; // Messages to convey
  } | null;
  previousCallLog?: FollowupPreviousCallLog;
}

export interface CreateFollowupCallLogRequest {
  followupId: string;
  status: "completed" | "missed" | "busy" | "no_answer" | "voicemail" | "other";
  answers: Array<{
    questionId: string;
    question: string;
    answer: string | number | boolean;
    answerType: string;
  }>;
  callDuration?: number; // Duration in seconds
  notes?: string;
  callerNote?: string;
  followUpDate?: string; // ISO 8601 datetime
  followUpRequired?: boolean;
  followUpNote?: string; // Note for the new follow-up when scheduling
}

