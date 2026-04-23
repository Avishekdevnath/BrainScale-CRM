"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2, Settings } from "lucide-react";
import type { FormItem } from "@/types/forms.types";

type Props = {
  form: Partial<FormItem>;
  onFieldClick: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldMove: (fromIndex: number, toIndex: number) => void;
  onAddField: (sectionId: string) => void;
  onAddSection: () => void;
  onFormTitleChange: (title: string) => void;
  onFormDescriptionChange: (description: string) => void;
};

export function FormBuilderCanvas({
  form,
  onFieldClick,
  onFieldDelete,
  onFieldMove,
  onAddField,
  onAddSection,
  onFormTitleChange,
  onFormDescriptionChange,
}: Props) {
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {/* Form Header Card */}
      <Card variant="groups1">
        <div className="h-1" style={{
          backgroundColor: `hsl(var(--groups1-primary))`
        }} />
        <CardContent variant="groups1" className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title" className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Form Title</Label>
              <Input
                id="form-title"
                value={form.title || ""}
                onChange={(e) => onFormTitleChange(e.target.value)}
                placeholder="e.g. Feedback Survey"
                className="mt-2"
                style={{
                  borderColor: `hsl(var(--groups1-border))`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `hsl(var(--groups1-text))`
                }}
              />
            </div>
            <div>
              <Label htmlFor="form-description" className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Description</Label>
              <Textarea
                id="form-description"
                value={form.description || ""}
                onChange={(e) => onFormDescriptionChange(e.target.value)}
                placeholder="What this form is for"
                rows={3}
                className="mt-2"
                style={{
                  borderColor: `hsl(var(--groups1-border))`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `hsl(var(--groups1-text))`
                }}
              />
            </div>
            <Button size="sm" variant="outline">
              ⚙️ Form Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sections and Fields */}
      {form.fields && Array.isArray(form.fields) && form.fields.length > 0 ? (
        (form.fields as any[]).map((field, index) => (
          <Card
            key={field.id || index}
            variant="groups1"
            draggable
            onDragStart={(e) => {
              setDraggedFieldId(field.id || String(index));
              e.dataTransfer!.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedFieldId) {
                const fromIndex = (form.fields as any[]).findIndex(
                  f => (f.id || (form.fields as any[]).indexOf(f)) === draggedFieldId
                );
                if (fromIndex !== -1 && fromIndex !== index) {
                  onFieldMove(fromIndex, index);
                }
              }
              setDraggedFieldId(null);
              setDragOverIndex(null);
            }}
            style={{
              opacity: draggedFieldId === (field.id || String(index)) ? 0.5 : 1,
              backgroundColor: dragOverIndex === index
                ? `hsl(var(--groups1-primary) / 0.1)`
                : `hsl(var(--groups1-surface))`,
              cursor: 'grab',
              borderColor: `hsl(var(--groups1-border))`
            }}>
            <CardContent variant="groups1" className="pt-6 space-y-3">
              <div className="flex items-start gap-3">
                <GripVertical className="h-5 w-5 mt-1 cursor-grab text-[var(--groups1-text-secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{color: `hsl(var(--groups1-text))`}}>
                    {field.label || "Untitled field"}
                  </p>
                  <p className="text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>
                    {field.type}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFieldClick(field.id || String(index))}
                    title="Configure field">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFieldDelete(field.id || String(index))}
                    title="Delete field"
                    style={{color: `hsl(var(--danger))`}}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-12 rounded-lg border-2 border-dashed" style={{borderColor: `hsl(var(--groups1-border))`}}>
          <p style={{color: `hsl(var(--groups1-text-secondary))`}}>No fields yet. Add one from the left panel.</p>
        </div>
      )}

      {/* Add Section Button */}
      <Button onClick={onAddSection} variant="outline" className="w-full">
        + Add Section
      </Button>
    </div>
  );
}
