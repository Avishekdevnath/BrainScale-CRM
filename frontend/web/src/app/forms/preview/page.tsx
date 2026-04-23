"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/types/forms.types";

export const PREVIEW_SESSION_KEY = "brainscale:form-preview";

type PreviewData = {
  title: string;
  description?: string;
  type?: string;
  moduleName?: string;
  courseName?: string;
  batchName?: string;
  fields: FormField[];
};

function renderDescription(raw?: string): { isHtml: boolean; content: string } {
  if (!raw?.trim()) return { isHtml: false, content: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "doc") {
      const html = generateHTML(parsed, [StarterKit, Link]);
      return { isHtml: true, content: html };
    }
  } catch {
    // not JSON — plain text
  }
  return { isHtml: false, content: raw };
}

export default function FormPreviewPage() {
  const [data, setData] = useState<PreviewData | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_SESSION_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `hsl(var(--groups1-background))` }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: `hsl(var(--groups1-primary))` }} />
      </div>
    );
  }

  const setValue = (id: string, value: unknown) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const description = renderDescription(data.description);

  return (
    <div className="min-h-screen" style={{ backgroundColor: `hsl(var(--groups1-background))` }}>

      {/* Preview banner */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between border-b px-5 py-2.5"
        style={{
          backgroundColor: `hsl(var(--groups1-surface) / 0.95)`,
          borderColor: `var(--groups1-border)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => window.close()}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors cursor-pointer"
          style={{ color: `var(--groups1-text-secondary)` }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `var(--groups1-text)`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = `var(--groups1-text-secondary)`; }}
        >
          <ArrowLeft className="h-4 w-4" />
          Close preview
        </button>

        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]"
          style={{
            backgroundColor: `hsl(var(--groups1-primary) / 0.12)`,
            color: `hsl(var(--groups1-primary))`,
          }}
        >
          Preview — not accepting responses
        </div>

        <div className="w-36" />
      </div>

      {/* Form body */}
      <div className="mx-auto max-w-3xl px-4 py-12">

        {/* Header card — clean flat design */}
        <div className="pb-8 space-y-4 border-b" style={{ borderColor: `var(--groups1-border)` }}>

            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
              style={{ color: `var(--groups1-text)` }}
            >
              {data.title || "Untitled form"}
            </h1>

            {description.content && (
              description.isHtml ? (
                <div
                  className="prose-preview text-sm leading-5"
                  style={{ color: `var(--groups1-text-secondary)`, lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: description.content }}
                />
              ) : (
                <p className="text-sm leading-5" style={{ color: `var(--groups1-text-secondary)` }}>
                  {description.content}
                </p>
              )
            )}

            {(data.moduleName || data.courseName) && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs" style={{ color: `var(--groups1-text-secondary)` }}>
                {data.moduleName && <span>Module: {data.moduleName}</span>}
                {data.courseName && <span>Course: {data.courseName}</span>}
              </div>
            )}
        </div>

        {/* Fields */}
        {data.fields.length === 0 ? (
          <div
            className="py-10 text-center text-sm"
            style={{ color: `var(--groups1-text-secondary)` }}
          >
            No questions added yet
          </div>
        ) : (
          <div className="space-y-8">
            {
          data.fields.map((field) => {
            if (field.type === "section_break") {
              return (
                <div key={field.id} className="pt-6">
                  <h2 className="text-lg font-semibold tracking-tight" style={{ color: `var(--groups1-text)` }}>
                    {field.label || "Untitled section"}
                  </h2>
                  {field.helpText?.trim() && (
                    <p className="mt-1 text-sm leading-6" style={{ color: `var(--groups1-text-secondary)` }}>
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            }

            const qField = field;
            const options = qField.options ?? [];
            const value = answers[field.id];

            return (
              <div key={field.id} className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-semibold" style={{ color: `var(--groups1-text)` }}>
                      {field.label || "Untitled question"}
                      {qField.required && (
                        <span className="ml-1" style={{ color: `hsl(var(--danger))` }}>*</span>
                      )}
                    </Label>
                  </div>
                  {qField.helpText?.trim() && (
                    <p className="text-sm leading-5" style={{ color: `var(--groups1-text-secondary)` }}>
                      {qField.helpText}
                    </p>
                  )}

                  {field.type === "long_text" ? (
                    <Textarea
                      rows={4}
                      value={String(value ?? "")}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      placeholder={qField.placeholder || "Your answer"}
                      className="rounded-lg border"
                      style={{
                        borderColor: `var(--groups1-border)`,
                        backgroundColor: `hsl(var(--groups1-background))`,
                        color: `var(--groups1-text)`,
                      }}
                    />
                  ) : field.type === "dropdown" && options.length ? (
                    <select
                      value={String(value ?? "")}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      className="flex h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: `var(--groups1-border)`,
                        backgroundColor: `hsl(var(--groups1-background))`,
                        color: `var(--groups1-text)`,
                      }}
                    >
                      <option value="">Select an option</option>
                      {options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : field.type === "radio" && options.length ? (
                    <div className="space-y-3">
                      {options.map((o) => (
                        <label
                          key={o}
                          className="flex items-center gap-3 text-sm cursor-pointer"
                          style={{
                            color: `var(--groups1-text)`,
                          }}
                        >
                          <input type="radio" name={field.id} checked={String(value) === o} onChange={() => setValue(field.id, o)} className="accent-[hsl(var(--groups1-primary))]" />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === "checkbox" && options.length ? (
                    <div className="space-y-3">
                      {options.map((o) => {
                        const checked = Array.isArray(value) ? value.includes(o) : false;
                        return (
                          <label
                            key={o}
                            className="flex items-center gap-3 text-sm cursor-pointer"
                            style={{
                              color: `var(--groups1-text)`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              className="accent-[hsl(var(--groups1-primary))]"
                              onChange={(e) => {
                                const current = Array.isArray(value) ? [...value] : [];
                                setValue(field.id, e.target.checked ? [...new Set([...current, o])] : current.filter((x) => x !== o));
                              }}
                            />
                            <span>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                      value={String(value ?? "")}
                      onChange={(e) => setValue(field.id, e.target.value)}
                      placeholder={qField.placeholder || "Your answer"}
                      className="h-11 rounded-lg border"
                      style={{
                        borderColor: `var(--groups1-border)`,
                        backgroundColor: `hsl(var(--groups1-background))`,
                        color: `var(--groups1-text)`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })
            }
          </div>
        )}

        {/* Submit row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t" style={{ borderColor: `var(--groups1-border)` }}>
          <p className="text-sm order-2 sm:order-1" style={{ color: `hsl(var(--groups1-text-secondary))` }}>
            Preview only — submissions are disabled
          </p>
          <button
            type="button"
            disabled
            className="inline-flex w-full sm:w-auto sm:min-w-40 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium cursor-not-allowed order-1 sm:order-2"
            style={{
              backgroundColor: `hsl(var(--groups1-primary) / 0.5)`,
              color: `hsl(var(--groups1-text) / 0.5)`,
            }}
          >
            Submit response
          </button>
        </div>

      </div>
    </div>
  );
}
