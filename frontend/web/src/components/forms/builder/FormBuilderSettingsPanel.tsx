"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

type Props = {
  fieldId: string | null;
  fieldLabel: string;
  fieldHelpText: string;
  fieldRequired: boolean;
  fieldValidation: string; // "none" | "email" | "phone" | "url" | "number" | "regex" | "min-max"
  onFieldLabelChange: (value: string) => void;
  onFieldHelpTextChange: (value: string) => void;
  onFieldRequiredChange: (required: boolean) => void;
  onFieldValidationChange: (validation: string) => void;
  onDeleteField: () => void;
  onClose: () => void;
  onSave: () => void;
};

export function FormBuilderSettingsPanel({
  fieldId,
  fieldLabel,
  fieldHelpText,
  fieldRequired,
  fieldValidation,
  onFieldLabelChange,
  onFieldHelpTextChange,
  onFieldRequiredChange,
  onFieldValidationChange,
  onDeleteField,
  onClose,
  onSave,
}: Props) {
  if (!fieldId) return null;

  return (
    <div className="w-80 border-l flex flex-col" style={{
      borderColor: `hsl(var(--groups1-border))`,
      backgroundColor: `hsl(var(--groups1-surface))`
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{
        borderColor: `hsl(var(--groups1-border))`
      }}>
        <h3 className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Field Settings</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Content */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <Label htmlFor="field-label" className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Label</Label>
          <Input
            id="field-label"
            value={fieldLabel}
            onChange={(e) => onFieldLabelChange(e.target.value)}
            placeholder="Field label"
            className="mt-2"
            style={{
              borderColor: `hsl(var(--groups1-border))`,
              backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
              color: `hsl(var(--groups1-text))`
            }}
          />
        </div>

        <div>
          <Label htmlFor="field-help" className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Help Text</Label>
          <Textarea
            id="field-help"
            value={fieldHelpText}
            onChange={(e) => onFieldHelpTextChange(e.target.value)}
            placeholder="Optional help text"
            rows={2}
            className="mt-2"
            style={{
              borderColor: `hsl(var(--groups1-border))`,
              backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
              color: `hsl(var(--groups1-text))`
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="field-required"
            checked={fieldRequired}
            onChange={(e) => onFieldRequiredChange(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <Label htmlFor="field-required" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Required</Label>
        </div>

        {/* Advanced Section */}
        <div className="border-t pt-4" style={{borderColor: `hsl(var(--groups1-border))`}}>
          <details className="space-y-3">
            <summary className="cursor-pointer font-semibold text-sm" style={{color: `hsl(var(--groups1-text))`}}>▼ Advanced Options</summary>
            <div>
              <Label htmlFor="field-validation" className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Validation</Label>
              <select
                id="field-validation"
                value={fieldValidation}
                onChange={(e) => onFieldValidationChange(e.target.value)}
                className="w-full mt-2 h-10 rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: `hsl(var(--groups1-border))`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `hsl(var(--groups1-text))`
                }}>
                <option value="none">None</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="url">URL</option>
                <option value="number">Number</option>
                <option value="regex">Regex Pattern</option>
                <option value="min-max">Min/Max Length</option>
              </select>
            </div>
          </details>
        </div>
      </CardContent>

      {/* Footer Buttons */}
      <div className="border-t p-4 space-y-2 flex gap-2" style={{borderColor: `hsl(var(--groups1-border))`}}>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteField}
          className="flex-1">
          Delete
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          className="flex-1"
          style={{
            backgroundColor: `hsl(var(--groups1-primary))`,
            color: `hsl(var(--groups1-btn-primary-text))`
          }}>
          Save
        </Button>
      </div>
    </div>
  );
}
