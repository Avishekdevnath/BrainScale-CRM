"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePublicForm } from "@/hooks/useForms";
import { apiClient } from "@/lib/api-client";

type Props = {
  slug: string;
};

type PublicSettings = {
  confirmationMessage?: string;
  allowMultipleSubmissions?: boolean;
};

type RenderField = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  helpText?: string;
  options?: string[];
};

function normalizeFormFields(form: { fields?: unknown } | null | undefined): RenderField[] {
  if (!form?.fields || !Array.isArray(form.fields)) return [];
  return (form.fields as Array<Record<string, unknown>>)
    .map((f) => ({
      id: String(f.id || ""),
      label: String(f.label || "Untitled question"),
      type: String(f.type || "short_text"),
      required: !!f.required,
      helpText: String(f.helpText || ""),
      options: Array.isArray(f.options) ? f.options.map(String) : [],
    }))
    .filter((f) => !!f.id);
}

export function FormRenderer({ slug }: Props) {
  const { data: form, isLoading, error } = usePublicForm(slug);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("Your response has been recorded.");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fields = useMemo(() => normalizeFormFields(form), [form]);
  const publicSettings = (form?.settings as PublicSettings | undefined) ?? {};

  const setValue = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setValidationErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "section_break") {
        continue;
      }
      const value = answers[field.id];
      const emptyArray = Array.isArray(value) && value.length === 0;
      const emptyString = value === undefined || value === null || String(value).trim() === "";
      if (field.required && (emptyArray || emptyString)) {
        nextErrors[field.id] = "This field is required";
      }
    }
    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    if (!validate()) {
      const firstError = Object.keys(validationErrors)[0];
      if (firstError) {
        document.getElementById(firstError)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.error("Please complete the required fields");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.submitPublicForm(slug, { answers });
      setSubmitted(true);
      setSubmitMessage(publicSettings?.confirmationMessage || "Your response has been recorded.");
      setAnswers({});
      toast.success("Response submitted successfully");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{
        backgroundColor: `hsl(var(--groups1-background))`
      }}>
        <div className="flex items-center gap-3 rounded-full px-4 py-2" style={{
          borderColor: `hsl(var(--groups1-border))`,
          backgroundColor: `hsl(var(--groups1-surface))`,
          border: '1px solid'
        }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{color: `hsl(var(--groups1-primary))`}} /> Loading form...
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{
        backgroundColor: `hsl(var(--groups1-background))`
      }}>
        <Card variant="groups1" className="max-w-md">
          <CardContent variant="groups1" className="p-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center" style={{
              backgroundColor: `hsl(var(--danger) / 0.15)`
            }}>
              <CheckCircle2 className="h-7 w-7" style={{color: `hsl(var(--danger))`}} />
            </div>
            <h2 className="text-xl font-semibold" style={{color: `hsl(var(--groups1-text))`}}>Form unavailable</h2>
            <p className="mt-2 text-sm" style={{color: `hsl(var(--groups1-text-secondary))`}}>This form is not currently available or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{
        backgroundColor: `hsl(var(--groups1-background))`
      }}>
        <Card variant="groups1" className="w-full max-w-xl">
          <CardContent variant="groups1" className="p-8 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center shadow-inner" style={{
              backgroundColor: `hsl(var(--groups1-primary) / 0.15)`
            }}>
              <CheckCircle2 size={34} style={{color: `hsl(var(--groups1-primary))`}} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight" style={{color: `hsl(var(--groups1-text))`}}>Submission received</h2>
              <p className="mt-2" style={{color: `hsl(var(--groups1-text-secondary))`}}>{submitMessage}</p>
            </div>
            {publicSettings?.allowMultipleSubmissions ? (
              <button
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition"
                style={{
                  backgroundColor: `hsl(var(--groups1-primary))`,
                  color: `hsl(var(--groups1-btn-primary-text))`,
                }}
                onClick={() => {
                  setSubmitted(false);
                  setValidationErrors({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Submit another response
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition"
                style={{
                  backgroundColor: `hsl(var(--groups1-primary))`,
                  color: `hsl(var(--groups1-btn-primary-text))`,
                }}
                onClick={() => window.location.assign("/")}
              >
                Return home
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{
      backgroundColor: `hsl(var(--groups1-background))`
    }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.28em]" style={{color: `hsl(var(--groups1-text-secondary))`}}>
          <span>BrainScale Forms</span>
          <span>{String(form?.type || "form")}</span>
        </div>

        <Card variant="groups1" className="overflow-hidden">
          <div className="h-1" style={{
            backgroundColor: `hsl(var(--groups1-primary))`
          }} />
          <CardContent variant="groups1" className="space-y-6 p-6 sm:p-8">
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{
                borderColor: `hsl(var(--groups1-primary) / 0.3)`,
                backgroundColor: `hsl(var(--groups1-primary) / 0.1)`,
                color: `hsl(var(--groups1-primary))`,
                border: '1px solid'
              }}>
                Public form
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{color: `hsl(var(--groups1-text))`}}>{form.title}</h1>
                {form.description ? (
                  <p className="mt-2 text-sm sm:text-base leading-6" style={{color: `hsl(var(--groups1-text-secondary))`}}>{form.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>
                {form.moduleName ? <span className="rounded-full px-3 py-1" style={{backgroundColor: `hsl(var(--groups1-border))`}}>Module: {form.moduleName}</span> : null}
                {form.courseName ? <span className="rounded-full px-3 py-1" style={{backgroundColor: `hsl(var(--groups1-border))`}}>Course: {form.courseName}</span> : null}
                {form.batchName ? <span className="rounded-full px-3 py-1" style={{backgroundColor: `hsl(var(--groups1-border))`}}>Batch: {form.batchName}</span> : null}
              </div>
            </header>

            <form onSubmit={submit} className="space-y-5">
              {fields.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6" style={{
                  borderColor: `hsl(var(--groups1-border))`,
                  backgroundColor: `hsl(var(--groups1-border) / 0.3)`
                }}>
                  <Label htmlFor="default-answer" className="text-sm font-medium" style={{color: `hsl(var(--groups1-text))`}}>Your response</Label>
                  <Textarea
                    id="default-answer"
                    rows={5}
                    value={String(answers.default ?? "")}
                    onChange={(e) => setValue("default", e.target.value)}
                    placeholder="Write your response"
                    style={{
                      borderColor: `hsl(var(--groups1-border))`,
                      backgroundColor: `hsl(var(--groups1-surface))`,
                      color: `hsl(var(--groups1-text))`
                    }}
                  />
                </div>
              ) : (
                fields.map((field) => {
                  const value = answers[field.id];
                  if (field.type === "section_break") {
                    return (
                      <div key={field.id} className="rounded-[24px] p-5 sm:p-6 shadow-sm" style={{
                        borderColor: `hsl(var(--groups1-primary) / 0.3)`,
                        backgroundColor: `hsl(var(--groups1-primary) / 0.08)`,
                        border: '1px solid'
                      }}>
                        <div className="text-xs font-medium uppercase tracking-[0.24em]" style={{color: `hsl(var(--groups1-primary))`}}>Section</div>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight" style={{color: `hsl(var(--groups1-text))`}}>{field.label}</h2>
                        {field.helpText ? <p className="mt-2 text-sm leading-6" style={{color: `hsl(var(--groups1-text-secondary))`}}>{field.helpText}</p> : null}
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="rounded-2xl border p-4 sm:p-5 shadow-sm space-y-3" style={{
                      borderColor: `hsl(var(--groups1-border))`,
                      backgroundColor: `hsl(var(--groups1-surface))`
                    }}>
                      <div>
                        <Label htmlFor={field.id} className="text-sm font-semibold" style={{color: `hsl(var(--groups1-text))`}}>
                          {field.label} {field.required ? <span style={{color: `hsl(var(--danger))`}}>*</span> : null}
                        </Label>
                        <p className="mt-1 text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>{field.type.replaceAll("_", " ")}</p>
                      </div>

                      {field.type === "long_text" ? (
                        <Textarea
                          id={field.id}
                          value={String(value ?? "")}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          rows={5}
                          style={{
                            borderColor: `hsl(var(--groups1-border))`,
                            backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                            color: `hsl(var(--groups1-text))`
                          }}
                        />
                      ) : field.type === "dropdown" && field.options?.length ? (
                        <select
                          id={field.id}
                          className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
                          style={{
                            borderColor: `hsl(var(--groups1-border))`,
                            backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                            color: `hsl(var(--groups1-text))`
                          }}
                          value={String(value ?? "")}
                          onChange={(e) => setValue(field.id, e.target.value)}
                        >
                          <option value="">Select an option</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === "checkbox" && field.options?.length ? (
                        <div className="grid gap-2">
                          {field.options.map((option) => {
                            const checked = Array.isArray(value) ? value.includes(option) : false;
                            return (
                              <label key={option} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style={{
                                borderColor: `hsl(var(--groups1-border))`,
                                backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                                color: `hsl(var(--groups1-text))`
                              }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const current = Array.isArray(value) ? [...value] : [];
                                    const next = e.target.checked
                                      ? [...new Set([...current, option])]
                                      : current.filter((item) => item !== option);
                                    setValue(field.id, next);
                                  }}
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : field.type === "radio" && field.options?.length ? (
                        <div className="grid gap-2">
                          {field.options.map((option) => (
                            <label key={option} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style={{
                              borderColor: `hsl(var(--groups1-border))`,
                              backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                              color: `hsl(var(--groups1-text))`
                            }}>
                              <input
                                type="radio"
                                name={field.id}
                                checked={String(value ?? "") === option}
                                onChange={() => setValue(field.id, option)}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <Input
                          id={field.id}
                          type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                          value={String(value ?? "")}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          className="h-11 rounded-xl border"
                          style={{
                            borderColor: `hsl(var(--groups1-border))`,
                            backgroundColor: `hsl(var(--groups1-border) / 0.3)`,
                            color: `hsl(var(--groups1-text))`
                          }}
                        />
                      )}

                      {validationErrors[field.id] ? <p className="text-sm" style={{color: `hsl(var(--danger))`}}>{validationErrors[field.id]}</p> : null}
                    </div>
                  );
                })
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <p className="text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>By submitting, you confirm the information above is accurate.</p>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium transition"
                  style={{
                    backgroundColor: `hsl(var(--groups1-primary))`,
                    color: `hsl(var(--groups1-btn-primary-text))`
                  }}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? "Submitting..." : "Submit response"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
