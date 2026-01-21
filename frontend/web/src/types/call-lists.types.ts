// Call Lists API Types - Backend Response Structures

export type CallListSource = "FILTER" | "MANUAL" | "IMPORT";

export type CallListItemState = "QUEUED" | "CALLING" | "DONE" | "SKIPPED";

export type QuestionType = "text" | "yes_no" | "multiple_choice" | "number" | "date";

export type CallLogStatus = "completed" | "missed" | "busy" | "no_answer" | "voicemail" | "other";

// Question interface for call lists
export interface Question {
  id: string; // Unique identifier within call list
  question: string; // Question text (min 1 character)
  type: QuestionType;
  options?: string[]; // Required for multiple_choice, min 2 items
  required: boolean; // Whether answer is required
  order: number; // Display order (non-negative integer)
}

// Answer interface for call log answers
export interface Answer {
  questionId: string; // References Question.id
  question: string; // Question text (for reference)
  answer: string | number | boolean; // Answer value
  answerType: string; // Type of answer (matches question type)
}

export interface CallListGroupRef {
  id: string;
  name: string;
  batchId?: string | null;
  batch?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
}

export interface CallList {
  id: string;
  workspaceId: string;
  groupId: string | null; // null for workspace-level call lists
  name: string;
  source: CallListSource;
  description: string | null; // Optional description text
  messages: string[]; // Array of messages to convey during calls
  meta?: Record<string, any> | null; // JSON object containing questions and custom configuration
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; // Call list status
  completedAt?: string | null; // ISO 8601 datetime when marked complete
  completedBy?: string | null; // User ID who marked it complete
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  group?: CallListGroupRef | null; // null for workspace-level call lists
  _count?: {
    items: number;
  };
  // Extracted from meta.questions in API responses
  questions?: Question[];
}

export interface CallListStudentRef {
  id: string;
  name: string;
  email: string | null;
  phones: Array<{
    id?: string;
    phone: string;
    isPrimary: boolean;
  }>;
  status?: string;
  groups?: Array<{
    id: string;
    name: string;
    batch?: {
      id: string;
      name: string;
    } | null;
  }>;
}

export interface CallListAssigneeUser {
  id: string;
  name: string;
  email: string;
}

export interface CallListAssignee {
  id: string;
  user: CallListAssigneeUser;
}

export interface CallListItem {
  id: string;
  callListId: string;
  studentId: string;
  assignedTo: string | null; // WorkspaceMember ID
  callLogId: string | null; // Set when call is completed
  state: CallListItemState;
  priority: number; // 0-100, default: 0
  custom: Record<string, any> | null; // Custom field values
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  student?: CallListStudentRef;
  assignee?: CallListAssignee | null;
  callList?: {
    id: string;
    name: string;
    description: string | null;
    messages: string[];
    questions?: Question[];
    group?: {
      id: string;
      name: string;
      batch?: {
        id: string;
        name: string;
      } | null;
    } | null;
  };
  callLog?: {
    id: string;
    status: string;
    callDate: string;
    callDuration: number | null;
    assignedTo: string;
    followUpRequired: boolean;
    answers?: Answer[];
    notes?: string | null;
    callerNote?: string | null;
    followUpDate?: string | null;
  } | null;
}

export interface StudentData {
  name: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  discordId?: string;
  tags?: string[];
}

export interface CreateCallListPayload {
  name: string; // Required, min 2 chars
  source: CallListSource; // Required
  description?: string; // Optional
  groupId: string; // Required - for group-specific lists
  batchId?: string; // Optional - Batch ID for filtering students by batch
  studentIds?: string[]; // Optional - for workspace-level lists
  studentsData?: StudentData[]; // Optional - student data for auto-creation
  groupIds?: string[]; // Optional - filter students by groups
  messages?: string[]; // Optional - array of messages to convey
  questions?: Question[]; // Optional - array of questions
  matchBy?: 'email' | 'phone' | 'email_or_phone' | 'name'; // Optional - matching strategy
  skipDuplicates?: boolean; // Optional - skip duplicate students
  meta?: Record<string, any>; // Optional - custom fields configuration
}

export interface UpdateCallListPayload {
  name?: string; // Optional, min 2 chars
  description?: string; // Optional
  messages?: string[]; // Optional
  questions?: Question[]; // Optional
  meta?: Record<string, any>; // Optional
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; // Optional - admin only
}

export interface CallListsListParams {
  groupId?: string;
  batchId?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  page?: number;
  size?: number;
}

export interface CallListsListResponse {
  callLists: CallList[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CallListItemsListParams {
  page?: number;
  size?: number;
  state?: CallListItemState;
  assignedTo?: string;
}

export interface CallListItemsListResponse {
  items: CallListItem[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface AddCallListItemsPayload {
  studentIds: string[];
}

export interface UpdateCallListItemPayload {
  state?: CallListItemState;
  priority?: number;
  custom?: Record<string, any>;
}

export interface AssignCallListItemsPayload {
  itemIds: string[]; // Required, min 1 item
  assignedTo?: string; // Optional - if not provided, assigns to current user
}

export interface UnassignCallListItemsPayload {
  itemIds: string[]; // Required, min 1 item
}

// Call Log Types
export interface CallLog {
  id: string;
  callListItemId: string; // Unique reference to CallListItem
  callListId: string; // Quick access to call list
  studentId: string; // Quick access to student
  assignedTo: string; // WorkspaceMember ID who made the call
  callDate: string; // ISO 8601 datetime (default: now)
  callDuration: number | null; // Duration in seconds
  status: CallLogStatus;
  answers: Answer[]; // Array of question answers
  notes: string | null; // Additional notes
  callerNote: string | null; // Caller's manual notes (separate from AI summary)
  summaryNote: string | null; // AI-generated summary (optional)
  sentiment?: string | null; // AI sentiment analysis: 'positive', 'neutral', 'negative', 'concerned'
  sentimentScore?: number | null; // Confidence score 0.0 to 1.0
  aiProcessedAt?: string | null; // ISO 8601 datetime when AI processing completed
  aiProcessingStatus?: string | null; // AI processing status: 'pending', 'completed', 'failed'
  followUpDate: string | null; // ISO 8601 datetime
  followUpRequired: boolean; // Default: false
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  // Relations (included in API responses)
  callListItem?: CallListItem;
  callList?: {
    id: string;
    name: string;
    description: string | null;
    messages: string[];
    questions?: Question[];
    group?: {
      id: string;
      name: string;
      batch?: {
        id: string;
        name: string;
      } | null;
    } | null;
  };
  student?: {
    id: string;
    name: string;
    email: string | null;
    phones: Array<{
      phone: string;
      isPrimary: boolean;
    }>;
  };
  assignee?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface CreateCallLogRequest {
  callListItemId: string; // Required
  callDuration?: number; // Optional, integer, min 0, duration in seconds
  status: CallLogStatus; // Required
  answers: Answer[]; // Required, min 1 item
  notes?: string; // Optional
  callerNote?: string; // Optional - caller's manual notes
  followUpDate?: string; // Optional, ISO 8601 datetime
  followUpRequired?: boolean; // Optional, default: false
  followUpNote?: string; // Optional - note for the follow-up call
}

export interface UpdateCallLogRequest {
  callDuration?: number; // Optional, integer, min 0
  status?: CallLogStatus; // Optional
  answers?: Answer[]; // Optional
  notes?: string; // Optional
  callerNote?: string; // Optional
  followUpDate?: string; // Optional, ISO 8601
  followUpRequired?: boolean; // Optional
  followUpNote?: string; // Optional - note for the follow-up call
}

// My Calls Types
export interface GetMyCallsParams {
  page?: number; // Optional, default: 1, min: 1
  size?: number; // Optional, default: 20, min: 1, max: 100
  batchId?: string; // Optional
  groupId?: string; // Optional
  callListId?: string; // Optional
  state?: CallListItemState; // Optional
  followUpRequired?: boolean; // Optional - filter by follow-ups required
}

export interface MyCallsResponse {
  items: CallListItem[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface MyCallsStats {
  totalAssigned: number; // Total items assigned to user
  completed: number; // Items with state DONE
  pending: number; // Items with state QUEUED or CALLING
  thisWeek: number; // Call logs created this week
  followUps: number; // Pending follow-ups (items where latest call log requires follow-up)
  totalFollowUpCalls: number; // Total follow-up calls for analytics (all call logs with followUpRequired: true)
  byCallList: Array<{
    callListId: string;
    callListName: string;
    count: number;
  }>;
  byBatch: Array<{
    batchId: string;
    batchName: string;
    count: number;
  }>;
  byGroup: Array<{
    groupId: string;
    groupName: string;
    count: number;
  }>;
}

// Call Logs Types
export interface GetCallLogsParams {
  page?: number; // Optional, default: 1, min: 1
  size?: number; // Optional, default: 20, min: 1, max: 100
  studentId?: string; // Optional
  callListId?: string; // Optional
  assignedTo?: string; // Optional
  status?: CallLogStatus; // Optional
  dateFrom?: string; // Optional, ISO 8601
  dateTo?: string; // Optional, ISO 8601
  batchId?: string; // Optional
  groupId?: string; // Optional
}

export interface CallLogsResponse {
  logs: CallLog[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface GetMyCallHistoryParams {
  page?: number; // Optional, default: 1
  size?: number; // Optional, default: 20, max: 100
  studentId?: string; // Optional
  callListId?: string; // Optional
  status?: string; // Optional
  dateFrom?: string; // Optional, ISO 8601
  dateTo?: string; // Optional, ISO 8601
}

// Import Preview & Commit Types
export interface ImportPreviewResponse {
  headers: string[];
  previewRows: Record<string, any>[];
  totalRows: number;
  suggestions: {
    name?: string;
    email?: string;
    phone?: string;
  };
  matchingStats: {
    willMatch: number;
    willCreate: number;
    willSkip: number;
  };
  importId: string;
  message: string;
}

export interface CommitImportRequest {
  importId: string;
  columnMapping: {
    name: string;
    email?: string;
    phone?: string;
  };
  matchBy?: 'email' | 'phone' | 'name' | 'email_or_phone';
  createNewStudents?: boolean;
  skipDuplicates?: boolean;
}

export interface CommitImportResponse {
  message: string;
  stats: {
    matched: number;
    created: number;
    added: number;
    duplicates: number;
    errors: number;
  };
  errors: string[];
}

// Bulk Email Paste Types
export interface BulkEmailPasteRequest {
  emails: string[]; // Array of validated email addresses
  groupId?: string; // Auto-enroll new students to this group
  batchId?: string; // Auto-assign new students to this batch
  createNewStudents?: boolean; // Default: true
  enrollToGroup?: boolean; // Default: true if groupId provided
  assignToBatch?: boolean; // Default: true if batchId provided
}

export interface BulkEmailPasteResponse {
  message: string;
  stats: {
    matched: number; // Existing students found
    created: number; // New students created
    enrolled: number; // Students enrolled to group
    assigned: number; // Students assigned to batch
    added: number; // Students added to call list (after dedupe)
    duplicates: number; // Duplicate emails in input
    skipped: number; // Already in call list
    errors: number; // Failed operations
  };
  errors: Array<{
    email: string;
    message: string;
  }>;
}

// Bulk Paste Call List Types (for creating call lists from pasted data)
export type BulkPasteCallListMappingOld = {
  name?: string;
  email?: string;
  phone?: string;
};

export type BulkPasteCallListMappingFlexible = {
  "student.name": string;
  "student.email"?: string;
  "student.discordId"?: string;
  "student.tags"?: string;
  [key: `phone.${number}`]: string; // phone.0, phone.1, etc.
  [key: `phone.${string}`]: string; // phone.primary, phone.secondary, etc.
};

export type BulkPasteCallListMapping = BulkPasteCallListMappingOld | BulkPasteCallListMappingFlexible;

export interface BulkPasteCallListRequest {
  name: string;
  description?: string;
  data: string; // CSV or tab-separated text data
  columnMapping: BulkPasteCallListMapping;
  matchBy?: 'email' | 'phone' | 'email_or_phone' | 'name';
  createNewStudents?: boolean;
  skipDuplicates?: boolean;
  messages?: string[];
  questions?: Question[];
  meta?: Record<string, any>;
}

export interface BulkPasteCallListResponse {
  callList: CallList;
  stats: {
    matched: number;
    created: number;
    added: number;
    duplicates: number;
    errors: number;
  };
  errors: string[];
  message: string;
}

// Current Workspace Member Type
export interface CurrentWorkspaceMember {
  id: string; // WorkspaceMember ID
  userId: string; // User ID
  workspaceId: string;
  role: string;
  customRole?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  permissions?: Array<{
    id: string;
    resource: string;
    action: string;
    description: string | null;
  }>;
  groupAccess?: Array<{
    id: string;
    group: {
      id: string;
      name: string;
    };
  }>;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

