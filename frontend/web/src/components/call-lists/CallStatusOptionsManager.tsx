"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2, Check, X, Plus, Lock } from "lucide-react";
import { useCallStatusOptions } from "@/hooks/useCallLists";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CallStatusOption } from "@/types/call-lists.types";

const PRESET_COLORS = [
  { hex: "#22c55e", name: "Green" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#6b7280", name: "Gray" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#ec4899", name: "Pink" },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.name}
          onClick={() => onChange(c.hex)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
            value === c.hex ? "border-[var(--groups1-text)] scale-110" : "border-transparent"
          )}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

function StatusRow({
  option,
  onEdit,
  onDelete,
}: {
  option: CallStatusOption;
  onEdit: (id: string, label: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [label, setLabel] = React.useState(option.label);
  const [color, setColor] = React.useState(option.color);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onEdit(option.id, label.trim(), color);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(option.id);
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-3 p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-secondary)]">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          />
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving || !label.trim()} className="h-8 w-8 p-0">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setLabel(option.label); setColor(option.color); setEditing(false); }} className="h-8 w-8 p-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] group">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
      <span className="text-sm text-[var(--groups1-text)] flex-1">{option.label}</span>
      {option.isDefault && (
        <span className="text-xs text-[var(--groups1-text-secondary)] flex items-center gap-1">
          <Lock className="w-3 h-3" /> Default
        </span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 w-7 p-0">
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={option.isDefault || deleting}
          title={option.isDefault ? "Cannot delete a default status" : "Delete"}
          className="h-7 w-7 p-0 text-red-400 hover:text-red-500 disabled:opacity-30"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

export function CallStatusOptionsManager() {
  const { data: options, isLoading, mutate } = useCallStatusOptions();
  const [addLabel, setAddLabel] = React.useState("");
  const [addColor, setAddColor] = React.useState("#6b7280");
  const [adding, setAdding] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);

  const handleEdit = async (id: string, label: string, color: string) => {
    await apiClient.updateCallStatusOption(id, { label, color });
    toast.success("Status updated");
    await mutate();
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this status option?");
    if (!confirmed) return;
    await apiClient.deleteCallStatusOption(id);
    toast.success("Status deleted");
    await mutate();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLabel.trim()) return;
    setAdding(true);
    try {
      await apiClient.createCallStatusOption({ label: addLabel.trim(), color: addColor });
      toast.success("Status added");
      setAddLabel("");
      setAddColor("#6b7280");
      setShowAddForm(false);
      await mutate();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add status");
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--groups1-text)]">Call Status Options</h2>
          <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">
            Default statuses cannot be deleted. Labels and colors are editable.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm((v) => !v)}
          className="h-8 text-xs bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Status
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="p-4 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="e.g. Interested"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <ColorPicker value={addColor} onChange={setAddColor} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={adding || !addLabel.trim()} className="h-8 text-xs">
              {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setAddLabel(""); setAddColor("#6b7280"); }} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {(options ?? []).map((option) => (
          <StatusRow
            key={option.id}
            option={option}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {(options ?? []).length === 0 && (
          <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-6">No status options found.</p>
        )}
      </div>
    </div>
  );
}
