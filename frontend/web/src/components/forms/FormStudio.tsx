"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldEditor, type FormField } from "./FormFieldEditor";
import type { CreateFormPayload, FormItem } from "@/types/forms.types";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";

type Props = {
  initial?: Partial<FormItem> | null;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateFormPayload) => Promise<void> | void;
  onCancel?: () => void;
};

type Step = "details" | "fields" | "preview" | "confirm";

export function FormStudio({ initial, isSubmitting, onSubmit, onCancel }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [moduleName, setModuleName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setType((initial?.type as string) || "general");
    setModuleName(initial?.moduleName || "");
    setCourseName(initial?.courseName || "");
    setBatchName(initial?.batchName || "");
    if (Array.isArray(initial?.fields)) {
      setFields(initial.fields as FormField[]);
    }
  }, [initial]);

  const submit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      moduleName: moduleName.trim() || undefined,
      courseName: courseName.trim() || undefined,
      batchName: batchName.trim() || undefined,
      fields: fields as any,
      settings: {},
    });
  };

  const canProceed =
    step === "details"
      ? title.trim().length > 0
      : step === "fields"
        ? fields.length > 0
        : true;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 max-h-screen overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <Card className="border-0 shadow-2xl">
          {/* Header */}
          <div className="h-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Studio</span>
                </div>
                <CardTitle className="text-2xl tracking-tight">{getStepTitle(step)}</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 mb-2">Step {getStepNumber(step)} of 4</p>
                <div className="flex gap-1">
                  {(["details", "fields", "preview", "confirm"] as Step[]).map((s) => (
                    <div
                      key={s}
                      className={`h-1 w-8 rounded-full transition-colors ${
                        step === s
                          ? "bg-purple-600"
                          : ["details", "fields", "preview", "confirm"].indexOf(s) <
                              ["details", "fields", "preview", "confirm"].indexOf(step)
                            ? "bg-green-500"
                            : "bg-zinc-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Details Step */}
            {step === "details" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">
                    Form title
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. Customer Feedback 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-zinc-500">This title will show to respondents</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Why are you collecting this data? What will you do with responses?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-semibold">
                      Form type
                    </Label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
                    >
                      <option value="general">General Feedback</option>
                      <option value="survey">Survey</option>
                      <option value="quiz">Quiz/Assessment</option>
                      <option value="attendance">Attendance</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
                    Optional targeting
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="module" className="text-xs">
                        Module
                      </Label>
                      <Input
                        id="module"
                        placeholder="Module 3"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="course" className="text-xs">
                        Course
                      </Label>
                      <Input
                        id="course"
                        placeholder="Python 101"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="batch" className="text-xs">
                        Batch
                      </Label>
                      <Input
                        id="batch"
                        placeholder="2026 Spring"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fields Step */}
            {step === "fields" && (
              <div>
                <FormFieldEditor fields={fields} onChange={setFields} />
              </div>
            )}

            {/* Preview Step */}
            {step === "preview" && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-1">{title || "Untitled Form"}</h3>
                  <p className="text-sm text-zinc-600">{description || "(No description)"}</p>
                  {(moduleName || courseName || batchName) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {moduleName && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">📦 {moduleName}</span>}
                      {courseName && <span className="bg-green-100 text-green-700 px-2 py-1 rounded">📚 {courseName}</span>}
                      {batchName && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">📅 {batchName}</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Fields ({fields.length})</p>
                  {fields.map((field) => (
                    <div key={field.id} className="p-3 bg-zinc-50 rounded-lg border text-sm">
                      <p className="font-medium">
                        {field.label || "Untitled"}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <p className="text-xs text-zinc-500">{field.type}</p>
                      {field.helpText && <p className="text-xs text-zinc-600 mt-1">{field.helpText}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Step */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Form ready to launch</p>
                    <p className="text-sm text-green-800 mt-1">
                      {fields.length} fields • {type} form • {initial?.id ? "Updating" : "Creating new"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Summary</p>
                  <div className="space-y-1 text-zinc-600">
                    <p>
                      <span className="font-medium text-zinc-900">Title:</span> {title}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-900">Type:</span> {type}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-900">Fields:</span> {fields.length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 justify-between pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "details") {
                    onCancel?.();
                  } else {
                    const steps: Step[] = ["details", "fields", "preview", "confirm"];
                    const idx = steps.indexOf(step);
                    setStep(steps[idx - 1]);
                  }
                }}
              >
                {step === "details" ? "Cancel" : <ArrowLeft className="w-4 h-4 mr-2" />}{" "}
                {step === "details" ? "" : "Back"}
              </Button>

              <div className="flex gap-2">
                {step !== "confirm" && (
                  <Button
                    type="button"
                    disabled={!canProceed}
                    onClick={() => {
                      const steps: Step[] = ["details", "fields", "preview", "confirm"];
                      const idx = steps.indexOf(step);
                      setStep(steps[idx + 1]);
                    }}
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === "confirm" && (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={submit}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isSubmitting ? "Creating..." : initial?.id ? "Update form" : "Launch form"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getStepTitle(step: Step): string {
  const titles: Record<Step, string> = {
    details: "Form details",
    fields: "Add form fields",
    preview: "Preview",
    confirm: "Confirm & launch",
  };
  return titles[step];
}

function getStepNumber(step: Step): number {
  return (["details", "fields", "preview", "confirm"] as Step[]).indexOf(step) + 1;
}
