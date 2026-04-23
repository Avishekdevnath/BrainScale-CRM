"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormItem } from "@/types/forms.types";

type CourseOption = { id: string; name: string; isActive: boolean };
type ModuleOption = { id: string; name: string; isActive: boolean; course?: { id: string; name: string } };
type BatchOption = { id: string; name: string; isActive: boolean };

type Props = {
  form: FormItem;
  onSave: (settings: any) => Promise<void>;
  isSubmitting?: boolean;
  courses?: CourseOption[];
  allModules?: ModuleOption[];
  batches?: BatchOption[];
  coursesLoading?: boolean;
  modulesLoading?: boolean;
  batchesLoading?: boolean;
};

export function FormSettings({
  form,
  onSave,
  isSubmitting,
  courses = [],
  allModules = [],
  batches = [],
  coursesLoading = false,
  modulesLoading = false,
  batchesLoading = false,
}: Props) {
  const settings = typeof form.settings === "object" && form.settings ? (form.settings as any) : {};
  const [showProgress, setShowProgress] = useState(settings.showProgress ?? true);
  const [allowMultiple, setAllowMultiple] = useState(settings.allowMultipleSubmissions ?? false);
  const [confirmationMessage, setConfirmationMessage] = useState(settings.confirmationMessage || "Thank you for your response!");
  const [redirectUrl, setRedirectUrl] = useState(settings.redirectUrl || "");
  const [accentColor, setAccentColor] = useState(settings.accentColor || "#218085"); // teal default
  const [selectedCourseName, setSelectedCourseName] = useState(settings.courseName || "");
  const [selectedModuleName, setSelectedModuleName] = useState(settings.moduleName || "");
  const [selectedBatchName, setSelectedBatchName] = useState(settings.batchName || "");

  const visibleModules = selectedCourseName
    ? allModules.filter((m) => m.course?.name === selectedCourseName)
    : allModules;

  const handleSave = async () => {
    await onSave({
      showProgress,
      allowMultipleSubmissions: allowMultiple,
      confirmationMessage,
      redirectUrl,
      accentColor,
      courseName: selectedCourseName,
      moduleName: selectedModuleName,
      batchName: selectedBatchName,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Display Settings */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle style={{color: `hsl(var(--groups1-text))`}}>Display Settings</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-progress"
              checked={showProgress}
              onChange={(e) => setShowProgress(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="show-progress" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Show Progress Bar</Label>
            <p className="text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>(Shows respondents how many fields they've completed)</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allow-multiple"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="allow-multiple" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Allow Multiple Submissions</Label>
            <p className="text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>(Same person can submit multiple times)</p>
          </div>

          <div>
            <Label htmlFor="confirmation-message" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Confirmation Message</Label>
            <Textarea
              id="confirmation-message"
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              placeholder="Shown after form submission"
              rows={3}
              className="mt-2"
              style={{
                borderColor: `hsl(var(--groups1-border))`,
                backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                color: `hsl(var(--groups1-text))`
              }}
            />
          </div>

          <div>
            <Label htmlFor="redirect-url" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Redirect URL (Optional)</Label>
            <Input
              id="redirect-url"
              type="url"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-2"
              style={{
                borderColor: `hsl(var(--groups1-border))`,
                backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                color: `hsl(var(--groups1-text))`
              }}
            />
            <p className="text-xs mt-1" style={{color: `hsl(var(--groups1-text-secondary))`}}>Users will be redirected here after submission</p>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle style={{color: `hsl(var(--groups1-text))`}}>Form Branding</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div>
            <Label htmlFor="accent-color" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Accent Color</Label>
            <div className="flex gap-2 mt-2">
              <input
                id="accent-color"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#218085"
                className="flex-1"
                style={{
                  borderColor: `hsl(var(--groups1-border))`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                  color: `hsl(var(--groups1-text))`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked To */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle style={{color: `hsl(var(--groups1-text))`}}>Link to CRM Data</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-course" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Course</Label>
            <select
              id="settings-course"
              value={selectedCourseName}
              onChange={(e) => {
                setSelectedCourseName(e.target.value);
                setSelectedModuleName("");
              }}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={{
                borderColor: `var(--groups1-border)`,
                backgroundColor: `var(--groups1-surface)`,
                color: `var(--groups1-text)`,
              }}
            >
              <option value="">{coursesLoading ? "Loading courses..." : "Select course (optional)"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.isActive ? c.name : `${c.name} (inactive)`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-module" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Module</Label>
            <select
              id="settings-module"
              value={selectedModuleName}
              onChange={(e) => setSelectedModuleName(e.target.value)}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={{
                borderColor: `var(--groups1-border)`,
                backgroundColor: `var(--groups1-surface)`,
                color: `var(--groups1-text)`,
              }}
            >
              <option value="">{modulesLoading ? "Loading modules..." : "Select module (optional)"}</option>
              {visibleModules.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.isActive ? m.name : `${m.name} (inactive)`}
                </option>
              ))}
            </select>
            {selectedCourseName && visibleModules.length === 0 && !modulesLoading && (
              <p className="text-xs" style={{color: `var(--groups1-text-secondary)`}}>No modules in this course</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-batch" className="font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Batch</Label>
            <select
              id="settings-batch"
              value={selectedBatchName}
              onChange={(e) => setSelectedBatchName(e.target.value)}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={{
                borderColor: `var(--groups1-border)`,
                backgroundColor: `var(--groups1-surface)`,
                color: `var(--groups1-text)`,
              }}
            >
              <option value="">{batchesLoading ? "Loading batches..." : "Select batch (optional)"}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.isActive ? b.name : `${b.name} (inactive)`}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSubmitting} className="w-full" style={{
        backgroundColor: `hsl(var(--groups1-primary))`,
        color: `hsl(var(--groups1-btn-primary-text))`
      }}>
        {isSubmitting ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
