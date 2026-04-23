"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Copy, GripVertical, Plus, Trash2, Type, Zap } from "lucide-react";

export interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "radio" | "date" | "file" | "rating" | "phone";
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  options?: string[];
}

const FIELD_TYPES = [
  { type: "text", label: "Short text", icon: "📝" },
  { type: "email", label: "Email", icon: "✉️" },
  { type: "number", label: "Number", icon: "🔢" },
  { type: "textarea", label: "Long text", icon: "📄" },
  { type: "select", label: "Dropdown", icon: "📋" },
  { type: "checkbox", label: "Checkbox", icon: "☑️" },
  { type: "radio", label: "Radio", icon: "⭕" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "phone", label: "Phone", icon: "📱" },
  { type: "file", label: "File upload", icon: "📎" },
  { type: "rating", label: "Rating", icon: "⭐" },
];

type Props = {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
};

export function FormFieldEditor({ fields, onChange }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: "",
      type,
      required: false,
    };
    onChange([...fields, newField]);
    setEditingId(newField.id);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const duplicateField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const newField = { ...field, id: `field-${Date.now()}` };
    const idx = fields.indexOf(field);
    onChange([...fields.slice(0, idx + 1), newField, ...fields.slice(idx + 1)]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const dragIdx = fields.findIndex((f) => f.id === draggedId);
    const targetIdx = fields.findIndex((f) => f.id === targetId);

    const newFields = [...fields];
    const [moved] = newFields.splice(dragIdx, 1);
    newFields.splice(targetIdx, 0, moved);
    onChange(newFields);
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      {!fields.length ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Type className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-600 mb-4">No fields yet. Add your first field below.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="relative group"
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, field.id)}
            >
              <Card
                className={`border transition-all ${
                  editingId === field.id ? "ring-2 ring-[var(--groups1-primary)] border-[var(--groups1-primary)]" : "hover:border-[var(--groups1-primary)]"
                } ${draggedId === field.id ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5 text-zinc-400" />
                  </div>

                  {editingId === field.id ? (
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label>Field label</Label>
                        <Input
                          placeholder="e.g. Enter your name"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                        />
                      </div>
                      {field.type === "select" || field.type === "checkbox" || field.type === "radio" ? (
                        <div className="space-y-1">
                          <Label>Options (comma-separated)</Label>
                          <Input
                            placeholder="e.g. Option 1, Option 2, Option 3"
                            value={field.options?.join(", ") || ""}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map((s) => s.trim()) })}
                          />
                        </div>
                      ) : null}
                      {field.type !== "file" && field.type !== "rating" ? (
                        <div className="space-y-1">
                          <Label>Placeholder</Label>
                          <Input
                            placeholder="Hint text for users"
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          />
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <Label>Help text</Label>
                        <Input
                          placeholder="Small text that helps users"
                          value={field.helpText || ""}
                          onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`${field.id}-required`}
                          checked={field.required || false}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor={`${field.id}-required`} className="font-normal cursor-pointer">
                          Required field
                        </Label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        className="w-full"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-w-0 cursor-pointer hover:bg-zinc-50 p-2 rounded -mx-2"
                      onClick={() => setEditingId(field.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {FIELD_TYPES.find((f) => f.type === field.type)?.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{field.label || "Untitled field"}</p>
                          <p className="text-xs text-zinc-500">
                            {FIELD_TYPES.find((f) => f.type === field.type)?.label}
                            {field.required ? " • Required" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingId !== field.id ? (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => duplicateField(field.id)}
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeField(field.id)} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs uppercase text-zinc-500 font-semibold">Add field</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {FIELD_TYPES.map((ft) => (
            <Button
              key={ft.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addField(ft.type as FormField["type"])}
              className="text-xs flex items-center gap-1 justify-center"
            >
              <span>{ft.icon}</span> <span className="hidden sm:inline">{ft.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
