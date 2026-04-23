"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FormItem, FormResponseItem } from "@/types/forms.types";
import { Download, Eye, FileText, Loader2 } from "lucide-react";

type Props = {
  form: FormItem;
  responses: FormResponseItem[];
  onExportCSV: () => void;
  onExportJSON: () => void;
  exportingFormat?: "csv" | "json" | null;
};

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function formatDuration(durationMs: number | null): string {
  if (!durationMs || durationMs <= 0) return "—";
  const totalSeconds = Math.round(durationMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? value.map((v) => String(v)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).trim();
  return text.length ? text : "—";
}

export function AnalyticsDashboard({ form, responses, onExportCSV, onExportJSON, exportingFormat = null }: Props) {
  const [selectedResponse, setSelectedResponse] = useState<FormResponseItem | null>(null);

  const requiredQuestionFields = useMemo(
    () => (form.fields || []).filter((field: any) => field.type !== "section_break" && field.required),
    [form.fields]
  );

  const questionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (form.fields || []).forEach((field: any) => {
      if (field?.id) map.set(String(field.id), String(field.label || field.id));
    });
    return map;
  }, [form.fields]);

  const primaryQuestionField = useMemo(
    () => (form.fields || []).find((field: any) => field.type !== "section_break") as any,
    [form.fields]
  );
  const primaryQuestionLabel = primaryQuestionField?.label ? String(primaryQuestionField.label) : "Response";
  const primaryQuestionId = primaryQuestionField?.id ? String(primaryQuestionField.id) : null;

  const completionCount = useMemo(
    () => responses.filter((response) => requiredQuestionFields.every((field: any) => hasValue(response.answers?.[field.id]))).length,
    [responses, requiredQuestionFields]
  );

  const completionRate = responses.length > 0 ? Math.round((completionCount / responses.length) * 100) : 0;

  const averageDurationMs = useMemo(() => {
    const durations = responses.map((r) => r.durationMs ?? null).filter((v): v is number => !!v && v > 0);
    if (!durations.length) return null;
    return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  }, [responses]);

  const lastResponseTime = useMemo(() => {
    if (!responses.length) return "—";
    const last = [...responses].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    return formatRelativeTime(last?.submittedAt);
  }, [responses]);

  const sortedResponses = useMemo(
    () => [...responses].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [responses]
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="groups1">
          <CardContent variant="groups1" className="pt-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">Total Responses</p>
            <p className="text-3xl font-bold mt-2" style={{color: `hsl(var(--groups1-primary))`}}>
              {responses.length}
            </p>
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardContent variant="groups1" className="pt-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">Completion Rate</p>
            <p className="text-3xl font-bold mt-2" style={{color: `hsl(var(--groups1-primary))`}}>
              {completionRate}%
            </p>
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardContent variant="groups1" className="pt-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">Avg. Time</p>
            <p className="text-3xl font-bold mt-2" style={{color: `hsl(var(--groups1-primary))`}}>
              {formatDuration(averageDurationMs)}
            </p>
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardContent variant="groups1" className="pt-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">Last Response</p>
            <p className="text-3xl font-bold mt-2" style={{color: `hsl(var(--groups1-primary))`}}>
              {lastResponseTime}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Records Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle style={{color: `hsl(var(--groups1-text))`}}>Response Records</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {sortedResponses.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: `hsl(var(--groups1-text-secondary))` }}>
              No responses yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--groups1-card-border-inner)]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--groups1-text-secondary)]">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--groups1-text-secondary)]">
                      {primaryQuestionLabel}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[var(--groups1-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResponses.map((response) => {
                    const fallbackEntry = Object.entries(response.answers || {}).find(([, answer]) => hasValue(answer));
                    const primaryAnswer = primaryQuestionId ? response.answers?.[primaryQuestionId] : undefined;
                    const valueText = hasValue(primaryAnswer)
                      ? formatAnswerValue(primaryAnswer)
                      : fallbackEntry
                        ? formatAnswerValue(fallbackEntry[1])
                        : "—";

                    return (
                      <tr key={response.id} className="border-b border-[var(--groups1-card-border-inner)] last:border-b-0">
                        <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">{formatDateTime(response.submittedAt)}</td>
                        <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)] max-w-[420px]">
                          <span className="block truncate" title={valueText}>{valueText}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedResponse(response)}
                            aria-label="View response details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
          </DialogHeader>

          {selectedResponse ? (
            <div className="space-y-4">
              <div className="text-sm" style={{ color: `hsl(var(--groups1-text-secondary))` }}>
                Submitted: {formatDateTime(selectedResponse.submittedAt)}
              </div>

              <div className="space-y-3">
                {Object.entries(selectedResponse.answers || {}).length === 0 ? (
                  <p className="text-sm" style={{ color: `hsl(var(--groups1-text-secondary))` }}>No answers recorded.</p>
                ) : (
                  Object.entries(selectedResponse.answers || {}).map(([fieldId, answer]) => (
                    <div key={fieldId} className="rounded-lg border p-3" style={{ borderColor: `hsl(var(--groups1-border))` }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--groups1-text-secondary))` }}>
                        {questionLabelById.get(fieldId) || fieldId}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: `hsl(var(--groups1-text))` }}>
                        {formatAnswerValue(answer)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button onClick={onExportCSV} disabled={exportingFormat !== null}>
          {exportingFormat === "csv" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Export CSV
        </Button>
        <Button variant="outline" onClick={onExportJSON} disabled={exportingFormat !== null}>
          {exportingFormat === "json" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} Export JSON
        </Button>
      </div>
    </div>
  );
}
