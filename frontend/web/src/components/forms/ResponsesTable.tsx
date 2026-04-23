"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormResponseItem } from "@/types/forms.types";

type Props = {
  responses: FormResponseItem[];
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function summarizeResponder(responder: FormResponseItem["responder"]) {
  if (!responder || typeof responder !== "object") return "Anonymous";
  const name = (responder as any).name;
  const email = (responder as any).email;
  if (name && email) return `${name} • ${email}`;
  if (name) return String(name);
  if (email) return String(email);
  return "Anonymous";
}

export function ResponsesTable({ responses }: Props) {
  return (
    <Card className="border-[var(--groups1-border)] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Responses</CardTitle>
        <p className="text-sm text-[var(--groups1-text-secondary)]">{responses.length} submission{responses.length === 1 ? "" : "s"} collected so far.</p>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--groups1-card)] shadow-sm">📭</div>
            <p className="text-sm font-medium text-[var(--groups1-text)]">No responses yet</p>
            <p className="mt-1 text-sm text-[var(--groups1-text-secondary)]">Responses will appear here after the form is published and submitted.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)]">
                  <th className="text-left p-3 font-medium">Submitted</th>
                  <th className="text-left p-3 font-medium">Responder</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">Answers</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--groups1-border)] last:border-b-0 align-top hover:bg-[var(--groups1-surface)] transition-colors">
                    <td className="p-3 whitespace-nowrap text-[var(--groups1-text)]">
                      <div className="font-medium">{new Date(r.submittedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-[var(--groups1-text-secondary)]">{new Date(r.submittedAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="p-3 text-[var(--groups1-text)]">
                      <div className="font-medium">{summarizeResponder(r.responder)}</div>
                      <div className="text-xs text-[var(--groups1-text-secondary)]">Submission #{responses.indexOf(r) + 1}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-[var(--groups1-text)]">
                      <span className="inline-flex rounded-full bg-[var(--groups1-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--groups1-text)]">
                        {r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : "—"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="grid gap-2">
                        {Object.entries(r.answers ?? {}).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wider text-[var(--groups1-text-secondary)]">{key}</div>
                            <div className="text-sm text-[var(--groups1-text)] break-words">{formatValue(value)}</div>
                          </div>
                        ))}
                        {Object.keys(r.answers ?? {}).length > 3 ? (
                          <div className="text-xs text-[var(--groups1-text-secondary)]">+{Object.keys(r.answers ?? {}).length - 3} more answers</div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
