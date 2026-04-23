export type TaskPriority = 'NORMAL' | 'URGENT';

export interface TaskType {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus =
  | 'AWAITING_ACCEPTANCE'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DECLINED'
  | 'DONE';

export type LinkedEntityType = 'call_list' | 'group' | 'student' | 'form';

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  assignedToId: string;
  assignedById: string;
  referredByMemberId: string | null;
  referredByName: string | null;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completionNote: string | null;
  completedAt: string | null;
  declineNote: string | null;
  linkedEntityType: LinkedEntityType | null;
  linkedEntityId: string | null;
  dueSoonNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  isOverdue: boolean;
  linkedEntityDeleted?: boolean;
  // Enriched member names
  assignedTo?: { user: { name: string | null } };
  assignedBy?: { user: { name: string | null } };
  taskTypeId: string | null;
  taskType?: { id: string; name: string; color: string } | null;
}

export interface TaskKpi {
  totalActive: number;
  completed: number;
  overdue: number;
  dueToday: number;
}

export interface ListTasksResponse {
  data: Task[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignedToId: string;
  dueDate: string;
  priority?: TaskPriority;
  taskTypeId?: string | null;
  linkedEntityType?: LinkedEntityType | null;
  linkedEntityId?: string | null;
  referredByMemberId?: string | null;
  referredByName?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  dueDate?: string;
  priority?: TaskPriority;
  taskTypeId?: string | null;
  linkedEntityType?: LinkedEntityType | null;
  linkedEntityId?: string | null;
}

export interface CreateTaskTypePayload {
  name: string;
  color?: string;
  description?: string | null;
}

export interface UpdateTaskTypePayload {
  name?: string;
  color?: string;
  description?: string | null;
}

export interface CompleteTaskPayload {
  completionNote?: string | null;
}

export interface DeclineTaskPayload {
  declineNote?: string | null;
}

export interface ListTasksParams {
  page?: number;
  size?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
  assignedById?: string;
  search?: string;
  sortBy?: 'dueDate' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  dueDateFrom?: string;
  dueDateTo?: string;
  taskTypeId?: string;
}
