"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateFormPayload, FormItem } from "@/types/forms.types";
import { FormBuilderCanvas } from "./builder/FormBuilderCanvas";
import { FormBuilderSettingsPanel } from "./builder/FormBuilderSettingsPanel";

type Props = {
  initial?: Partial<FormItem> | null;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateFormPayload) => Promise<void> | void;
  onCancel?: () => void;
};

export function FormBuilder({ initial, isSubmitting, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [fields, setFields] = useState<any[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setType((initial?.type as string) || "general");
    setFields(Array.isArray(initial?.fields) ? initial.fields : []);
    setSettings(typeof initial?.settings === "object" && initial?.settings ? (initial.settings as any) : {});
  }, [initial]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      fields,
      settings,
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Topbar */}
      <div className="border-b px-4 py-3 flex items-center justify-between" style={{
        borderColor: `hsl(var(--groups1-border))`
      }}>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>← Back</Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            className="max-w-xs"
            style={{
              borderColor: `hsl(var(--groups1-border))`,
              backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
              color: `hsl(var(--groups1-text))`
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Preview</Button>
          <Button size="sm" disabled={isSubmitting} onClick={handleSave} style={{
            backgroundColor: `hsl(var(--groups1-primary))`,
            color: `hsl(var(--groups1-btn-primary-text))`
          }}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline">Publish</Button>
        </div>
      </div>

      {/* Main Layout: 3 Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field Palette (hidden on mobile) */}
        <div className="hidden md:block w-52 border-r bg-[var(--groups1-surface)] p-4 overflow-y-auto border-[var(--groups1-border)]">
          <h3 className="font-semibold mb-4 text-sm" style={{color: `hsl(var(--groups1-text))`}}>Add Fields</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-[var(--groups1-text-secondary)] mb-2">BASIC</p>
              <div className="space-y-1">
                {["short_text", "email", "phone", "number", "long_text"].map((fieldType) => {
                  const typeLabels: Record<string, string> = {
                    short_text: "Text",
                    email: "Email",
                    phone: "Phone",
                    number: "Number",
                    long_text: "Textarea"
                  };
                  return (
                    <button
                      key={fieldType}
                      className="w-full text-left text-sm p-2 rounded hover:bg-[var(--groups1-secondary)] transition"
                      onClick={() => {
                        // Add new field to form
                        const newField = {
                          id: `field_${Date.now()}`,
                          label: typeLabels[fieldType] || fieldType,
                          type: fieldType,
                          required: false,
                          helpText: "",
                          options: []
                        };
                        setFields([...fields, newField]);
                      }}>
                      • {typeLabels[fieldType] || fieldType}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--groups1-text-secondary)] mb-2">CHOICE</p>
              <div className="space-y-1">
                {["dropdown", "radio", "checkbox"].map((fieldType) => {
                  const typeLabels: Record<string, string> = {
                    dropdown: "Dropdown",
                    radio: "Radio",
                    checkbox: "Checkbox"
                  };
                  return (
                    <button
                      key={fieldType}
                      className="w-full text-left text-sm p-2 rounded hover:bg-[var(--groups1-secondary)] transition"
                      onClick={() => {
                        const newField = {
                          id: `field_${Date.now()}`,
                          label: typeLabels[fieldType] || fieldType,
                          type: fieldType,
                          required: false,
                          helpText: "",
                          options: ["Option 1", "Option 2"]
                        };
                        setFields([...fields, newField]);
                      }}>
                      • {typeLabels[fieldType] || fieldType}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--groups1-text-secondary)] mb-2">ADVANCED</p>
              <div className="space-y-1">
                {["date", "time", "file_upload", "rating", "signature"].map((fieldType) => {
                  const typeLabels: Record<string, string> = {
                    date: "Date",
                    time: "Time",
                    file_upload: "File",
                    rating: "Rating",
                    signature: "Signature"
                  };
                  return (
                    <button
                      key={fieldType}
                      className="w-full text-left text-sm p-2 rounded hover:bg-[var(--groups1-secondary)] transition"
                      onClick={() => {
                        const newField = {
                          id: `field_${Date.now()}`,
                          label: typeLabels[fieldType] || fieldType,
                          type: fieldType,
                          required: false,
                          helpText: "",
                          options: []
                        };
                        setFields([...fields, newField]);
                      }}>
                      • {typeLabels[fieldType] || fieldType}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Canvas */}
        <FormBuilderCanvas
          form={{ title, description, fields }}
          onFieldClick={setSelectedFieldId}
          onFieldDelete={(fieldId) => {
            setFields(fields.filter(f => f.id !== fieldId));
          }}
          onFieldMove={(fromIndex, toIndex) => {
            const newFields = [...fields];
            const [movedField] = newFields.splice(fromIndex, 1);
            newFields.splice(toIndex, 0, movedField);
            setFields(newFields);
          }}
          onAddField={() => {}}
          onAddSection={() => {}}
          onFormTitleChange={setTitle}
          onFormDescriptionChange={setDescription}
        />

        {/* Right: Settings Panel (slides in when field selected) */}
        {selectedFieldId && (
          <FormBuilderSettingsPanel
            fieldId={selectedFieldId}
            fieldLabel=""
            fieldHelpText=""
            fieldRequired={false}
            fieldValidation="none"
            onFieldLabelChange={() => {}}
            onFieldHelpTextChange={() => {}}
            onFieldRequiredChange={() => {}}
            onFieldValidationChange={() => {}}
            onDeleteField={() => {
              setFields(fields.filter(f => f.id !== selectedFieldId));
              setSelectedFieldId(null);
            }}
            onClose={() => setSelectedFieldId(null)}
            onSave={() => setSelectedFieldId(null)}
          />
        )}
      </div>
    </div>
  );
}
