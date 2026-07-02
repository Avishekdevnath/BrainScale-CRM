export type NotificationType =
  // Follow-ups
  | 'FOLLOWUP_ASSIGNED'
  | 'FOLLOWUP_DUE_SOON'
  | 'FOLLOWUP_OVERDUE'
  // Call logs
  | 'CALL_LOG_COMPLETED'
  // Tasks
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_ACCEPTED'
  | 'TASK_STARTED'
  | 'TASK_DECLINED'
  | 'TASK_COMPLETED'
  | 'TASK_CANCELLED'
  // Forms
  | 'FORM_RESPONSE_RECEIVED'
  // Feedback
  | 'FEEDBACK_REPLY'
  // Platform
  | 'PLATFORM_ANNOUNCEMENT';

export interface NotificationMeta {
  entityId?: string;
  entityType?: string;
  studentName?: string;
  groupName?: string;
  dueAt?: string;
  taskId?: string;
  callLogId?: string;
  callListId?: string;
  formId?: string;
  responseId?: string;
  formTitle?: string;
  announcementId?: string;
  bodyRich?: unknown; // sanitized Tiptap doc for platform announcements
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  bodyRich?: unknown; // sanitized Tiptap doc
  targetType: 'ALL' | 'SELECTED';
  workspaceIds: string[];
  recipientCount: number;
  readCount?: number; // present in list responses
  createdAt: string;
  sentBy: { id: string; email: string; name: string | null };
}

export interface AnnouncementsListResponse {
  items: Announcement[];
  page: number;
  size: number;
  total: number;
}

export interface AnnouncementDetail extends Announcement {
  stats: {
    deliveredCount: number;
    readCount: number;
    unreadCount: number;
    workspaces: Array<{
      id: string;
      name: string;
      delivered: number;
      read: number;
    }>;
  };
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: NotificationMeta;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  workspaceId: string;
  userId: string;
  followupAssigned:     boolean;
  followupDueSoon:      boolean;
  followupOverdue:      boolean;
  callLogCompleted:     boolean;
  taskAssigned:         boolean;
  taskDueSoon:          boolean;
  taskUpdated:          boolean;
  formResponseReceived: boolean;
}

export interface NotificationsListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface NotificationCountResponse {
  unreadCount: number;
}
