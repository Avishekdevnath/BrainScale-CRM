export type NotificationType =
  | 'FOLLOWUP_ASSIGNED'
  | 'FOLLOWUP_DUE_SOON'
  | 'FOLLOWUP_OVERDUE'
  | 'CALL_LOG_COMPLETED';

export interface NotificationMeta {
  entityId?: string;
  entityType?: string;
  studentName?: string;
  groupName?: string;
  dueAt?: string;
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
  followupAssigned: boolean;
  followupDueSoon: boolean;
  followupOverdue: boolean;
  callLogCompleted: boolean;
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
