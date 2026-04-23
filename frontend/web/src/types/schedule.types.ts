export type WeeklyScheduleTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  isActive: boolean;
};

export type ScheduleSlot = {
  id: string;
  templateId: string;
  dayOfWeek: number;
  batchId: string | null;
  slotGroup: string;
  slotLabel: string;
  startTime: string;
  endTime: string;
  order: number;
};

export type ScheduleAssignment = {
  id: string;
  slotId: string;
  memberId: string;
  roleLabel?: string | null;
};

export type SaveScheduleTemplatePayload = {
  slots: Array<{
    dayOfWeek: number;
    batchId?: string | null;
    slotGroup: string;
    slotLabel: string;
    startTime: string;
    endTime: string;
    order: number;
  }>;
  assignments: Array<{
    dayOfWeek: number;
    batchId?: string | null;
    slotLabel: string;
    order: number;
    memberId: string;
    roleLabel?: string | null;
  }>;
};

export type ScheduleTemplateResponse = {
  template: WeeklyScheduleTemplate;
  slots: ScheduleSlot[];
  assignments: ScheduleAssignment[];
  batches: Array<{ id: string; name: string }>;
};

export type ScheduleException = {
  id: string;
  workspaceId: string;
  date: string;
  memberId: string | null;
  type: 'OFF_DAY' | 'SLOT_OVERRIDE';
  slotId: string | null;
  overrideMemberId: string | null;
  note: string | null;
  createdAt: string;
};

export type CreateScheduleExceptionPayload = {
  date: string;
  memberId?: string | null;
  type: 'OFF_DAY' | 'SLOT_OVERRIDE';
  slotId?: string | null;
  overrideMemberId?: string | null;
  note?: string | null;
};

// Bulk update types for spreadsheet editor
export type ChangeAction =
  | 'update_slot'
  | 'update_assignment'
  | 'create_slot'
  | 'delete_slot'
  | 'reorder_batch';

export interface ScheduleChange {
  action: ChangeAction;
  slotId?: string;
  assignmentId?: string;
  dayOfWeek?: number;
  batchId?: string;
  newOrder?: number;
  data?: Record<string, any>;
}

export interface QueuedChange {
  id: string;
  change: ScheduleChange;
  originalData?: Record<string, any>;
  timestamp: number;
}

export interface ScheduleEditorState {
  template: ScheduleTemplateResponse | null;
  queuedChanges: QueuedChange[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaveTime: number | null;
}

export interface EditCellState {
  slotId: string;
  fieldName: string;
  isEditing: boolean;
}
