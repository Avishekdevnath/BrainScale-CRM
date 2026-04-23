"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Task, CreateTaskPayload, UpdateTaskPayload, LinkedEntityType } from "@/types/tasks.types";
import type { WorkspaceMember } from "@/types/members.types";
import { mutate } from "swr";
import { useTaskTypes } from "@/hooks/useTasks";

const RichTextEditor = dynamic(
  () => import("@/components/forms/editors/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-24 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] animate-pulse" /> }
);

// ─── Create Task Dialog ───────────────────────────────────────────────────────

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMember[];
  currentMemberId: string;
  onSuccess?: () => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  members,
  currentMemberId,
  onSuccess,
}: CreateTaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const { data: taskTypes = [] } = useTaskTypes();
  const [form, setForm] = useState<{
    title: string;
    description: string;
    assignedToId: string;
    dueDate: string;
    priority: "NORMAL" | "URGENT";
    taskTypeId: string;
    linkedEntityType: LinkedEntityType | "";
    linkedEntityId: string;
    hasReferrer: boolean;
    referredByMemberId: string;
    referredByName: string;
  }>({
    title: "",
    description: "",
    assignedToId: currentMemberId,
    dueDate: "",
    priority: "NORMAL",
    taskTypeId: "",
    linkedEntityType: "",
    linkedEntityId: "",
    hasReferrer: false,
    referredByMemberId: "",
    referredByName: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        description: "",
        assignedToId: currentMemberId,
        dueDate: "",
        priority: "NORMAL",
        taskTypeId: "",
        linkedEntityType: "",
        linkedEntityId: "",
        hasReferrer: false,
        referredByMemberId: "",
        referredByName: "",
      });
    }
  }, [open, currentMemberId]);

  const isSelfAssigned = form.assignedToId === currentMemberId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assignedToId || !form.dueDate) return;

    setSaving(true);
    try {
      const payload: CreateTaskPayload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assignedToId: form.assignedToId,
        dueDate: new Date(form.dueDate).toISOString(),
        priority: form.priority,
        taskTypeId: form.taskTypeId || null,
        linkedEntityType: form.linkedEntityType || null,
        linkedEntityId: form.linkedEntityId.trim() || null,
        referredByMemberId: isSelfAssigned && form.hasReferrer ? form.referredByMemberId || null : null,
        referredByName: isSelfAssigned && form.hasReferrer ? form.referredByName.trim() || null : null,
      };
      await apiClient.createTask(payload);
      toast.success("Task created");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      mutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <Label htmlFor="task-desc">Description</Label>
            <div className="rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] min-h-[80px] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--groups1-primary)] transition-shadow">
              <RichTextEditor
                value={form.description ? (() => { try { return JSON.parse(form.description); } catch { return form.description; } })() : ""}
                onChange={(json) => setForm((f) => ({ ...f, description: JSON.stringify(json) }))}
                placeholder="Optional context or notes — supports bold, bullets, links"
              />
            </div>
            <p className="text-[10px] text-[var(--groups1-text-secondary)] mt-1 opacity-60">
              Tip: <kbd className="font-mono">Ctrl+B</kbd> bold · <kbd className="font-mono">Ctrl+I</kbd> italic · <kbd className="font-mono">-</kbd> + space for bullets
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-assignee">Assign To *</Label>
              <select
                id="task-assignee"
                value={form.assignedToId}
                onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.name ?? m.user?.email ?? m.id}
                    {m.id === currentMemberId ? " (Me)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="task-due">Due Date *</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "NORMAL" | "URGENT" }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            {taskTypes.length > 0 && (
              <div>
                <Label htmlFor="task-type">Type</Label>
                <select
                  id="task-type"
                  value={form.taskTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, taskTypeId: e.target.value }))}
                  className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                >
                  <option value="">No type</option>
                  {taskTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Linked To (optional)</Label>
              <select
                value={form.linkedEntityType}
                onChange={(e) => setForm((f) => ({ ...f, linkedEntityType: e.target.value as LinkedEntityType | "" }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              >
                <option value="">None</option>
                <option value="call_list">Call List</option>
                <option value="group">Group</option>
                <option value="student">Student</option>
                <option value="form">Form</option>
              </select>
            </div>
            {form.linkedEntityType && (
              <div>
                <Label>Entity ID</Label>
                <Input
                  value={form.linkedEntityId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedEntityId: e.target.value }))}
                  placeholder="Paste ID here"
                />
              </div>
            )}
          </div>
          {isSelfAssigned && (
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasReferrer}
                  onChange={(e) => setForm((f) => ({ ...f, hasReferrer: e.target.checked }))}
                  className="rounded"
                />
                Someone referred this task
              </label>
              {form.hasReferrer && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Referred by (member)</Label>
                    <select
                      value={form.referredByMemberId}
                      onChange={(e) => setForm((f) => ({ ...f, referredByMemberId: e.target.value }))}
                      className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                    >
                      <option value="">Select member</option>
                      {members.filter((m) => m.id !== currentMemberId).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user?.name ?? m.user?.email ?? m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Referred by (name)</Label>
                    <Input
                      value={form.referredByName}
                      onChange={(e) => setForm((f) => ({ ...f, referredByName: e.target.value }))}
                      placeholder="External name"
                      disabled={!!form.referredByMemberId}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !form.dueDate}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Accept / Decline Dialog ──────────────────────────────────────────────────

interface AcceptDeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  intent: "accept" | "decline";
  onSuccess?: () => void;
}

export function AcceptDeclineDialog({ open, onOpenChange, task, intent, onSuccess }: AcceptDeclineDialogProps) {
  const [saving, setSaving] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  useEffect(() => { if (open) setDeclineNote(""); }, [open]);

  const handleAccept = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await apiClient.acceptTask(task.id);
      toast.success("Task accepted");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      mutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to accept task");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await apiClient.declineTask(task.id, { declineNote: declineNote.trim() || null });
      toast.success("Task declined");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      mutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to decline task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{intent === "accept" ? "Accept Task" : "Decline Task"}</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-[var(--groups1-text)]">
              <span className="font-medium">{task.title}</span>
            </p>
            {intent === "decline" && (
              <div>
                <Label>Decline note (optional)</Label>
                <textarea
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  placeholder="Reason for declining..."
                  rows={2}
                  className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {intent === "accept" ? (
                <Button onClick={handleAccept} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept
                </Button>
              ) : (
                <Button variant="destructive" onClick={handleDecline} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Decline
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Complete Task Dialog ─────────────────────────────────────────────────────

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess?: () => void;
}

export function CompleteTaskDialog({ open, onOpenChange, task, onSuccess }: CompleteTaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { if (open) setNote(""); }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    try {
      await apiClient.completeTask(task.id, { completionNote: note.trim() || null });
      toast.success("Task marked as done");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      mutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to complete task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Task Done</DialogTitle>
        </DialogHeader>
        {task && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <p className="text-sm text-[var(--groups1-text)]">
              Completing: <span className="font-medium">{task.title}</span>
            </p>
            <div>
              <Label>Completion note (optional)</Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any notes on completion..."
                rows={2}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark Done
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Task Dialog ─────────────────────────────────────────────────────────

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess?: () => void;
}

export function EditTaskDialog({ open, onOpenChange, task, onSuccess }: EditTaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const { data: taskTypes = [] } = useTaskTypes();
  const [form, setForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    priority: "NORMAL" | "URGENT";
    taskTypeId: string;
    linkedEntityType: LinkedEntityType | "";
    linkedEntityId: string;
  }>({ title: "", description: "", dueDate: "", priority: "NORMAL", taskTypeId: "", linkedEntityType: "", linkedEntityId: "" });

  useEffect(() => {
    if (open && task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
        priority: task.priority,
        taskTypeId: task.taskTypeId ?? "",
        linkedEntityType: (task.linkedEntityType as LinkedEntityType) ?? "",
        linkedEntityId: task.linkedEntityId ?? "",
      });
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    try {
      const payload: UpdateTaskPayload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        priority: form.priority,
        taskTypeId: form.taskTypeId || null,
        linkedEntityType: form.linkedEntityType || null,
        linkedEntityId: form.linkedEntityId.trim() || null,
      };
      await apiClient.updateTask(task.id, payload);
      toast.success("Task updated");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <div className="rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] min-h-[80px] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--groups1-primary)] transition-shadow">
              <RichTextEditor
                value={form.description ? (() => { try { return JSON.parse(form.description); } catch { return form.description; } })() : ""}
                onChange={(json) => setForm((f) => ({ ...f, description: JSON.stringify(json) }))}
                placeholder="Add description..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "NORMAL" | "URGENT" }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          {taskTypes.length > 0 && (
            <div>
              <Label>Type</Label>
              <select
                value={form.taskTypeId}
                onChange={(e) => setForm((f) => ({ ...f, taskTypeId: e.target.value }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              >
                <option value="">No type</option>
                {taskTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Linked To</Label>
              <select
                value={form.linkedEntityType}
                onChange={(e) => setForm((f) => ({ ...f, linkedEntityType: e.target.value as LinkedEntityType | "" }))}
                className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
              >
                <option value="">None</option>
                <option value="call_list">Call List</option>
                <option value="group">Group</option>
                <option value="student">Student</option>
                <option value="form">Form</option>
              </select>
            </div>
            {form.linkedEntityType && (
              <div>
                <Label>Entity ID</Label>
                <Input
                  value={form.linkedEntityId}
                  onChange={(e) => setForm((f) => ({ ...f, linkedEntityId: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess?: () => void;
}

export function DeleteTaskDialog({ open, onOpenChange, task, onSuccess }: DeleteTaskDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await apiClient.deleteTask(task.id);
      toast.success("Task deleted");
      mutate((key: string) => typeof key === "string" && key.includes(":tasks"));
      mutate((key: string) => typeof key === "string" && key.includes(":task-kpi"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-[var(--groups1-text)]">
              Are you sure you want to delete <span className="font-medium">&quot;{task.title}&quot;</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
