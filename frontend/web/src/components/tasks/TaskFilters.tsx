"use client";

import { Input } from "@/components/ui/input";
import type { TaskType, TaskStatus, TaskPriority } from "@/types/tasks.types";

export interface TaskFilterState {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskTypeId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  assignedToId?: string;
  assignedById?: string;
}

interface TaskFiltersProps {
  value: TaskFilterState;
  onChange: (v: TaskFilterState) => void;
  showMemberFilter?: boolean;
  members?: { id: string; user: { name: string | null } }[];
  memberFilterLabel?: string;
  memberFilterField?: "assignedToId" | "assignedById";
  taskTypes?: TaskType[];
}

const selectClass =
  "h-9 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-1";

export function TaskFilters({
  value,
  onChange,
  showMemberFilter = false,
  members = [],
  memberFilterLabel = "Member",
  memberFilterField = "assignedToId",
  taskTypes = [],
}: TaskFiltersProps) {
  const set = (patch: Partial<TaskFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
    <div className="flex gap-2 items-center min-w-max flex-wrap sm:flex-nowrap sm:min-w-0">
      <Input
        placeholder="Search tasks..."
        value={value.search ?? ""}
        onChange={(e) => set({ search: e.target.value || undefined })}
        className="w-48 h-9 text-sm bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
      />

      <select
        value={value.status ?? ""}
        onChange={(e) => set({ status: (e.target.value || undefined) as TaskStatus | undefined })}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        <option value="AWAITING_ACCEPTANCE">Awaiting Acceptance</option>
        <option value="ACCEPTED">Accepted</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
        <option value="DECLINED">Declined</option>
      </select>

      <select
        value={value.priority ?? ""}
        onChange={(e) => set({ priority: (e.target.value || undefined) as TaskPriority | undefined })}
        className={selectClass}
      >
        <option value="">All Priorities</option>
        <option value="NORMAL">Normal</option>
        <option value="URGENT">Urgent</option>
      </select>

      {taskTypes.length > 0 && (
        <select
          value={value.taskTypeId ?? ""}
          onChange={(e) => set({ taskTypeId: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">All Types</option>
          {taskTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <Input
        type="date"
        value={value.dueDateFrom ?? ""}
        onChange={(e) => set({ dueDateFrom: e.target.value || undefined })}
        className="w-36 h-9 text-sm bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
        title="Due from"
      />
      <Input
        type="date"
        value={value.dueDateTo ?? ""}
        onChange={(e) => set({ dueDateTo: e.target.value || undefined })}
        className="w-36 h-9 text-sm bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
        title="Due to"
      />

      {showMemberFilter && members.length > 0 && (
        <select
          value={value[memberFilterField] ?? ""}
          onChange={(e) =>
            set({ [memberFilterField]: e.target.value || undefined })
          }
          className={selectClass}
        >
          <option value="">All {memberFilterLabel}s</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.name ?? m.id}
            </option>
          ))}
        </select>
      )}
    </div>
    </div>
  );
}
