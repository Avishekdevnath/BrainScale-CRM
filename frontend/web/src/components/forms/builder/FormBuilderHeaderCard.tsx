"use client";

import React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SharedRichTextEditor } from "@/components/forms/editors";

type FormBuilderHeaderCardProps = {
  title: string;
  description: string;
  questionCount: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  useRichEditor?: boolean;
};

export function FormBuilderHeaderCard({
  title,
  description,
  questionCount,
  onTitleChange,
  onDescriptionChange,
  useRichEditor = false,
}: FormBuilderHeaderCardProps) {
  return (
    <Card
      variant="groups1"
      className="overflow-hidden rounded-[28px]"
    >
      <div className="h-1.5" style={{ backgroundColor: `hsl(var(--groups1-primary))` }} />
      <CardContent variant="groups1" className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.24em]"
            style={{
              backgroundColor: `hsl(var(--groups1-primary) / 0.1)`,
              color: `hsl(var(--groups1-primary))`,
            }}
          >
            <FileText className="h-3.5 w-3.5" /> Questions
          </div>
          <div className="text-sm text-[var(--groups1-text-secondary)]">
            {questionCount} question{questionCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled form"
            className="h-auto border-0 px-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 bg-transparent"
            style={{ color: `var(--groups1-text)` }}
          />
          {useRichEditor ? (
            <div
              className="rounded-2xl overflow-hidden text-sm"
              style={{
                border: `1px solid var(--groups1-border)`,
                backgroundColor: `hsl(var(--groups1-surface))`,
              }}
            >
              <SharedRichTextEditor
                className="min-h-[140px]"
                onChange={(json) => onDescriptionChange(JSON.stringify(json))}
              />
            </div>
          ) : (
            <Textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Form description"
              rows={3}
              className="min-h-[88px] resize-none rounded-2xl text-sm leading-6"
              style={{
                border: `1px solid var(--groups1-border)`,
                backgroundColor: `hsl(var(--groups1-surface))`,
                color: `var(--groups1-text)`,
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
