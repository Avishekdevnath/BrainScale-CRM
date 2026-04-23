"use client";

import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTaskTypes } from "@/hooks/useTasks";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import type { TaskType } from "@/types/tasks.types";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#a855f7",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: value === c ? "var(--groups1-text)" : "transparent",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-[var(--groups1-border)]"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="w-28 h-8 text-sm font-mono bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
        />
      </div>
    </div>
  );
}

interface TypeFormState {
  name: string;
  color: string;
  description: string;
}

function TypeDialog({
  open,
  onOpenChange,
  editing,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TaskType | null;
  workspaceId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TypeFormState>({ name: "", color: "#6366f1", description: "" });

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm(editing
        ? { name: editing.name, color: editing.color, description: editing.description ?? "" }
        : { name: "", color: "#6366f1", description: "" }
      );
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        description: form.description.trim() || null,
      };
      if (editing) {
        await apiClient.updateTaskType(editing.id, payload);
        toast.success("Task type updated");
      } else {
        await apiClient.createTaskType(payload);
        toast.success("Task type created");
      }
      mutate((key: string) => typeof key === "string" && key.includes(":task-types"));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save task type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Task Type" : "New Task Type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Follow-up, Demo, Support"
              required
              maxLength={50}
            />
          </div>
          <div>
            <Label className="mb-2 block">Color</Label>
            <ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TaskTypesPage() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id ?? "");
  const { data: types = [], isLoading } = useTaskTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskType | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleEdit = (t: TaskType) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleDelete = async (t: TaskType) => {
    if (!confirm(`Delete type "${t.name}"? Tasks using this type will be unlinked.`)) return;
    setDeleting(t.id);
    try {
      await apiClient.deleteTaskType(t.id);
      toast.success("Task type deleted");
      mutate((key: string) => typeof key === "string" && key.includes(":task-types"));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete task type");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--groups1-primary)]/10">
            <Tag className="w-5 h-5 text-[var(--groups1-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--groups1-text)]">Task Types</h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Categorize tasks to make them easier to filter and manage
            </p>
          </div>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Type
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--groups1-text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--groups1-border)] p-12 text-center">
          <Tag className="w-8 h-8 mx-auto mb-3 text-[var(--groups1-text-secondary)] opacity-40" />
          <p className="text-sm font-medium text-[var(--groups1-text)]">No task types yet</p>
          <p className="text-xs text-[var(--groups1-text-secondary)] mt-1 mb-4">
            Create types like "Follow-up", "Demo", or "Support" to categorize your tasks
          </p>
          <Button onClick={handleNew} size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Create first type
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
          {types.map((t, i) => (
            <div
              key={t.id}
              className={`flex items-center justify-between px-4 py-3 hover:bg-[var(--groups1-surface)] transition-colors ${
                i < types.length - 1 ? "border-b border-[var(--groups1-border)]" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--groups1-text)]">{t.name}</span>
                    <span
                      className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: t.color + "22", color: t.color, border: `1px solid ${t.color}44` }}
                    >
                      {t.name}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-[var(--groups1-text-secondary)] truncate">{t.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(t)}
                  className="p-1.5 rounded-md hover:bg-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  disabled={deleting === t.id}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--groups1-text-secondary)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {deleting === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        workspaceId={workspaceId}
      />
    </div>
  );
}
