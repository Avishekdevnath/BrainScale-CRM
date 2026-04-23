"use client";

import { ChevronDown, Copy, GripVertical, LayoutPanelTop, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FormField, FormFieldType, QuestionField, SectionField } from "@/types/forms.types";
import { FIELD_TYPE_GROUPS } from "@/components/forms/formBuilderStudio.helpers";

type FieldTypeOption = {
  value: FormFieldType;
  label: string;
};

type FormBuilderQuestionCardProps = {
  field: FormField;
  index: number;
  questionNumber: number | null;
  sectionNumber: number | null;
  totalFields: number;
  isActive: boolean;
  fieldTypeOptions: FieldTypeOption[];
  fieldTypeLabel: string;
  onFocus: () => void;
  onUpdateField: (patch: Partial<FormField>) => void;
  onUpdateOption: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveField: (direction: "up" | "down") => void;
  onAddAfter: () => void;
  onAddSectionAfter: () => void;
};

function supportsPlaceholder(type: FormFieldType): boolean {
  return !["dropdown", "radio", "checkbox", "section_break"].includes(type);
}

function isChoiceField(type: FormFieldType): boolean {
  return ["dropdown", "radio", "checkbox"].includes(type);
}

export function FormBuilderQuestionCard({
  field,
  index,
  questionNumber,
  sectionNumber,
  totalFields,
  isActive,
  fieldTypeOptions,
  fieldTypeLabel,
  onFocus,
  onUpdateField,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onDuplicate,
  onDelete,
  onMoveField,
  onAddAfter,
  onAddSectionAfter,
}: FormBuilderQuestionCardProps) {
  const isSectionBreak = field.type === "section_break";
  const sectionField = isSectionBreak ? (field as SectionField) : null;
  const questionField = isSectionBreak ? null : (field as QuestionField);
  const normalizedOptions = questionField?.options ?? [];

  const selectClass = [
    "flex h-11 w-full appearance-none rounded-xl px-3 py-2 pr-10 text-sm font-medium outline-none transition",
    "border border-[var(--groups1-border)]",
    "bg-[var(--groups1-surface)]",
    "text-[var(--groups1-text)]",
    "focus:border-[var(--groups1-primary)] focus:ring-2 focus:ring-[hsl(var(--groups1-primary)/0.2)]",
  ].join(" ");

  return (
    <div className="relative">
      {/* Floating side toolbar — desktop only, shown when active */}
      {isActive && (
        <div
          className="absolute -right-12 top-0 hidden flex-col gap-1 md:flex"
          style={{ zIndex: 10 }}
        >
          <button
            type="button"
            title="Add question after"
            onClick={(e) => { e.stopPropagation(); onAddAfter(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={{
              border: `1px solid var(--groups1-border)`,
              backgroundColor: `var(--groups1-surface)`,
              color: `var(--groups1-text-secondary)`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `hsl(var(--groups1-primary))`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `var(--groups1-text-secondary)`; }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Add section after"
            onClick={(e) => { e.stopPropagation(); onAddSectionAfter(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={{
              border: `1px solid var(--groups1-border)`,
              backgroundColor: `var(--groups1-surface)`,
              color: `var(--groups1-text-secondary)`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `hsl(var(--groups1-primary))`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `var(--groups1-text-secondary)`; }}
          >
            <LayoutPanelTop className="h-4 w-4" />
          </button>
        </div>
      )}

    <Card
      className="rounded-[24px] border transition-all overflow-hidden"
      style={isActive ? {
        borderColor: `hsl(var(--groups1-primary) / 0.6)`,
        backgroundColor: `var(--groups1-surface)`,
        boxShadow: `0 20px 60px hsl(var(--groups1-primary) / 0.08)`,
      } : {
        borderColor: `var(--groups1-border)`,
        backgroundColor: `var(--groups1-surface)`,
      }}
    >
      {/* Left-edge active indicator */}
      {isActive && (
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-[24px]"
          style={{ backgroundColor: `hsl(var(--groups1-primary))` }}
        />
      )}
      <CardContent className="space-y-5 p-5 sm:p-6">
        <button type="button" className="w-full text-left" onClick={onFocus}>
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-2xl active:cursor-grabbing"
              title="Drag to reorder"
              style={{
                backgroundColor: `hsl(var(--groups1-primary) / 0.08)`,
                color: `hsl(var(--groups1-primary))`,
              }}
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--groups1-text-secondary)]">
                <span>{isSectionBreak ? `Section ${sectionNumber ?? index + 1}` : `Question ${questionNumber ?? index + 1}`}</span>
                <span>{fieldTypeLabel}</span>
                {questionField?.required ? (
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] tracking-[0.18em] text-rose-700">
                    Required
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--groups1-text)]">
                {field.label.trim() || "Untitled question"}
              </div>
              {!isActive && field.helpText?.trim() ? (
                <div className="mt-1 text-sm text-[var(--groups1-text-secondary)]">{field.helpText}</div>
              ) : null}
            </div>
          </div>
        </button>

        {isActive ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <Label>{isSectionBreak ? "Section title" : "Question label"}</Label>
                <Input
                  value={field.label}
                  onChange={(event) => onUpdateField({ label: event.target.value })}
                  placeholder={isSectionBreak ? "Section title" : "Question"}
                  className="h-11 rounded-xl"
                  style={{
                    borderColor: `var(--groups1-border)`,
                    backgroundColor: `var(--groups1-surface)`,
                    color: `var(--groups1-text)`,
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Field type</Label>
                <div className="relative">
                  <select
                    value={field.type}
                    onChange={(event) => onUpdateField({ type: event.target.value as FormFieldType })}
                    className={selectClass}
                  >
                    {FIELD_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {fieldTypeOptions
                      .filter((option) => !FIELD_TYPE_GROUPS.some((group) => group.options.some((groupOption) => groupOption.value === option.value)))
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--groups1-text-secondary)]" />
                </div>
              </div>
            </div>

            {supportsPlaceholder(field.type) ? (
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={questionField?.placeholder || ""}
                  onChange={(event) => onUpdateField({ placeholder: event.target.value })}
                  placeholder="Placeholder text"
                  className="h-11 rounded-xl"
                  style={{
                    borderColor: `var(--groups1-border)`,
                    backgroundColor: `var(--groups1-surface)`,
                    color: `var(--groups1-text)`,
                  }}
                />
              </div>
            ) : null}

            {isSectionBreak ? (
              <div className="space-y-2">
                <Label>Section description</Label>
                <Textarea
                  value={field.helpText || ""}
                  onChange={(event) => onUpdateField({ helpText: event.target.value })}
                  placeholder="Section description (optional)"
                  rows={3}
                  className="rounded-2xl"
                  style={{
                    borderColor: `var(--groups1-border)`,
                    backgroundColor: `var(--groups1-surface)`,
                    color: `var(--groups1-text)`,
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Help text</Label>
                <Input
                  value={field.helpText || ""}
                  onChange={(event) => onUpdateField({ helpText: event.target.value })}
                  placeholder="Optional helper text"
                  className="h-11 rounded-xl"
                  style={{
                    borderColor: `var(--groups1-border)`,
                    backgroundColor: `var(--groups1-surface)`,
                    color: `var(--groups1-text)`,
                  }}
                />
              </div>
            )}

            {isChoiceField(field.type) ? (
              <div
                className="space-y-3 rounded-2xl p-4"
                style={{
                  border: `1px solid var(--groups1-border)`,
                  backgroundColor: `hsl(var(--groups1-primary) / 0.04)`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--groups1-text)]">Options</div>
                    <div className="text-xs text-[var(--groups1-text-secondary)]">Trimmed and normalized on save.</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full cursor-pointer"
                    style={{ borderColor: `var(--groups1-border)`, color: `var(--groups1-text)` }}
                    onClick={onAddOption}
                  >
                    <Plus className="h-4 w-4" /> Add option
                  </Button>
                </div>

                <div className="space-y-2">
                  {normalizedOptions.map((option, optionIndex) => (
                    <div key={`${field.id}-option-${optionIndex}`} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(event) => onUpdateOption(optionIndex, event.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        className="h-10 rounded-xl"
                        style={{
                          borderColor: `var(--groups1-border)`,
                          backgroundColor: `var(--groups1-surface)`,
                          color: `var(--groups1-text)`,
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-full cursor-pointer"
                        style={{ borderColor: `var(--groups1-border)` }}
                        onClick={() => onRemoveOption(optionIndex)}
                        disabled={normalizedOptions.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isSectionBreak ? (
              <div
                className="rounded-[22px] p-5"
                style={{
                  border: `1px solid hsl(var(--groups1-primary) / 0.2)`,
                  backgroundColor: `hsl(var(--groups1-primary) / 0.06)`,
                }}
              >
                <div className="flex items-center gap-3" style={{ color: `hsl(var(--groups1-primary))` }}>
                  <LayoutPanelTop className="h-4 w-4" />
                  <div className="text-sm font-semibold">{field.label || "Section title"}</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--groups1-text-secondary)]">
                  {field.helpText?.trim() || "Section description (optional)"}
                </div>
              </div>
            ) : field.type === "long_text" ? (
              <Textarea
                rows={3}
                disabled
                placeholder={field.placeholder || "Long answer preview"}
                className="rounded-2xl"
                style={{
                  borderColor: `var(--groups1-border)`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `var(--groups1-text-secondary)`,
                }}
              />
            ) : (
              <Input
                disabled
                placeholder={field.placeholder || "Response preview"}
                className="h-11 rounded-xl"
                style={{
                  borderColor: `var(--groups1-border)`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `var(--groups1-text-secondary)`,
                }}
              />
            )}

            <div
              className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"
              style={{ borderColor: `var(--groups1-border)` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" className="rounded-full cursor-pointer text-[var(--groups1-text)]" onClick={onDuplicate}>
                  <Copy className="h-4 w-4" /> Duplicate
                </Button>
                <Button type="button" variant="ghost" className="rounded-full cursor-pointer text-rose-600" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full cursor-pointer"
                  style={{ borderColor: `var(--groups1-border)`, color: `var(--groups1-text)` }}
                  onClick={() => onMoveField("up")}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full cursor-pointer"
                  style={{ borderColor: `var(--groups1-border)`, color: `var(--groups1-text)` }}
                  onClick={() => onMoveField("down")}
                  disabled={index === totalFields - 1}
                >
                  Move down
                </Button>
              </div>

              {!isSectionBreak ? (
                <div
                  className="flex items-center gap-3 rounded-full px-3 py-2"
                  style={{
                    border: `1px solid var(--groups1-border)`,
                    backgroundColor: `hsl(var(--groups1-primary) / 0.05)`,
                  }}
                >
                  <span className="text-sm text-[var(--groups1-text)]">Required</span>
                  <Switch checked={!!field.required} onCheckedChange={(checked) => onUpdateField({ required: checked })} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
    </div>
  );
}
