"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUpload } from "@/components/common/FileUpload";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  UserPlus,
  SkipForward,
  XCircle,
} from "lucide-react";
import type {
  CommitImportRequest,
  ImportPreviewResponse,
  ImportProgress,
  ProcessImportCommitResponse,
} from "@/types/call-lists.types";
import { useAddStudentsDialogStore, type CallListImportSession } from "@/store/add-students-dialog";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "importing" | "done";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as { name?: string; message?: string; error?: { message?: string } };
    return e.message || e.error?.message || fallback;
  }
  return fallback;
}

// ─── Phase Labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  PREVIEW: "Preparing…",
  READY: "Ready to import…",
  MATCHING: "Matching existing students…",
  CREATING_STUDENTS: "Creating new students…",
  WRITING_RELATIONS: "Saving to call list…",
  COMPLETED: "Done",
  FAILED: "Failed",
};

function phaseLabel(phase?: string): string {
  if (!phase) return "Processing…";
  return PHASE_LABELS[phase] ?? phase;
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map Columns" },
  { id: "importing", label: "Importing" },
  { id: "done", label: "Done" },
];

function stepIndex(step: Step): number {
  return STEPS.findIndex((s) => s.id === step);
}

function ImportStepper({ step }: { step: Step }) {
  const current = stepIndex(step);
  return (
    <div className="flex items-center w-full mb-6">
      {STEPS.map((s, i) => {
        const done = i < current || (step === "done" && i === current);
        const active = i === current && step !== "done";
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  done
                    ? "bg-[var(--groups1-primary)] border-[var(--groups1-primary)] text-white"
                    : active
                    ? "bg-white dark:bg-[var(--groups1-surface)] border-[var(--groups1-primary)] text-[var(--groups1-primary)]"
                    : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]"
                )}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  active ? "text-[var(--groups1-primary)]" : done ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 transition-all",
                  i < current ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-border)]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color = "default",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: "default" | "green" | "blue" | "muted" | "red";
}) {
  const colorMap = {
    default: "text-[var(--groups1-text)] bg-[var(--groups1-surface)] border-[var(--groups1-border)]",
    green: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    blue: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    muted: "text-[var(--groups1-text-secondary)] bg-[var(--groups1-secondary)] border-[var(--groups1-border)]",
    red: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  return (
    <div className={cn("rounded-lg border p-3 flex flex-col items-center gap-1 text-center", colorMap[color])}>
      <Icon className="w-4 h-4 opacity-70" />
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

// ─── Styled Select ────────────────────────────────────────────────────────────

function StyledSelect({
  value,
  onChange,
  options,
  placeholder = "Select column",
  disabled,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full rounded-md border px-3 py-2 text-sm bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] transition-colors",
        error
          ? "border-red-500 dark:border-red-400"
          : "border-[var(--groups1-border)] hover:border-[var(--groups1-primary)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}

// ─── Main Props ───────────────────────────────────────────────────────────────

export interface CallListImportFromFileProps {
  callListId: string;
  onCancel: () => void;
  onSuccess?: () => void;
  onLockChange?: (locked: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CallListImportFromFile({
  callListId,
  onCancel,
  onSuccess,
  onLockChange,
}: CallListImportFromFileProps) {
  const storedSession = useAddStudentsDialogStore((s) => s.byCallListId[callListId]?.importSession);
  const setImportSession = useAddStudentsDialogStore((s) => s.setImportSession);

  const [step, setStep] = useState<Step>(() => (storedSession?.step as Step | undefined) ?? "upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(
    () => (storedSession?.preview as ImportPreviewResponse | null | undefined) ?? null
  );
  const [mapping, setMapping] = useState<{ name: string; email?: string; phone?: string }>(() => ({
    name: "",
    email: "",
    phone: "",
    ...(storedSession?.mapping ?? {}),
  }));
  const [options, setOptions] = useState<{
    matchBy: CommitImportRequest["matchBy"];
    createNewStudents: boolean;
    skipDuplicates: boolean;
  }>(() => ({
    matchBy: storedSession?.options?.matchBy ?? "email_or_phone",
    createNewStudents: storedSession?.options?.createNewStudents ?? true,
    skipDuplicates: storedSession?.options?.skipDuplicates ?? true,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => storedSession?.error ?? null);
  const [nameError, setNameError] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(
    () => (storedSession?.progress as ImportProgress | null | undefined) ?? null
  );
  const [commitResult, setCommitResult] = useState<ProcessImportCommitResponse["result"] | null>(
    () => (storedSession?.commitResult as ProcessImportCommitResponse["result"] | null | undefined) ?? null
  );
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 50;

  const cancelledRef = useRef(false);
  const hydratedRef = useRef(false);
  const commitResultRef = useRef<ProcessImportCommitResponse["result"] | null>(null);

  useEffect(() => {
    onLockChange?.(true);
    return () => onLockChange?.(false);
  }, [onLockChange]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!storedSession) {
      hydratedRef.current = true;
      return;
    }
    setStep((storedSession.step as Step | undefined) ?? "upload");
    setPreview((storedSession.preview as ImportPreviewResponse | null | undefined) ?? null);
    setMapping({ name: storedSession.mapping?.name ?? "", email: storedSession.mapping?.email ?? "", phone: storedSession.mapping?.phone ?? "" });
    setOptions({
      matchBy: storedSession.options?.matchBy ?? "email_or_phone",
      createNewStudents: storedSession.options?.createNewStudents ?? true,
      skipDuplicates: storedSession.options?.skipDuplicates ?? true,
    });
    setProgress((storedSession.progress as ImportProgress | null | undefined) ?? null);
    setCommitResult((storedSession.commitResult as ProcessImportCommitResponse["result"] | null | undefined) ?? null);
    setError(storedSession.error ?? null);
    hydratedRef.current = true;
  }, [storedSession]);

  const persistSession = useCallback(
    (partial?: Partial<CallListImportSession> | undefined, mode: "merge" | "replace" = "merge") => {
      const next: CallListImportSession = {
        step,
        preview: preview
          ? {
              importId: preview.importId,
              headers: preview.headers,
              previewRows: preview.previewRows ?? [],
              totalRows: preview.totalRows,
              suggestions: preview.suggestions,
              matchingStats: preview.matchingStats,
            }
          : null,
        mapping,
        options: {
          matchBy: (options.matchBy ?? "email_or_phone") as NonNullable<CommitImportRequest["matchBy"]>,
          createNewStudents: options.createNewStudents,
          skipDuplicates: options.skipDuplicates,
        },
        progress,
        commitResult: commitResult as CallListImportSession["commitResult"],
        error,
        includeCallerNotes: false,
      };

      const merged =
        mode === "replace" ? (partial as CallListImportSession) : ({ ...next, ...(partial ?? {}) } as CallListImportSession);
      setImportSession(callListId, merged);
    },
    [callListId, commitResult, error, mapping, options, preview, progress, setImportSession, step]
  );

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (step === "upload" && !preview && !error && !progress && !commitResult) return;
    persistSession();
  }, [commitResult, error, persistSession, preview, progress, step]);

  useEffect(() => {
    if (!preview?.suggestions) return;
    setMapping((prev) => {
      if (prev.name) return prev;
      return {
        name: preview.suggestions.name || "",
        email: preview.suggestions.email || "",
        phone: preview.suggestions.phone || "",
      };
    });
  }, [preview]);

  useEffect(() => {
    setOptions((prev) => {
      const allowed: Array<NonNullable<CommitImportRequest["matchBy"]>> = ["name"];
      if (mapping.email) allowed.push("email");
      if (mapping.phone) allowed.push("phone");
      if (mapping.email && mapping.phone) allowed.push("email_or_phone");

      const recommended: NonNullable<CommitImportRequest["matchBy"]> =
        mapping.email && mapping.phone ? "email_or_phone" : mapping.email ? "email" : mapping.phone ? "phone" : "name";

      let nextMatchBy: NonNullable<CommitImportRequest["matchBy"]> =
        prev.matchBy && allowed.includes(prev.matchBy) ? prev.matchBy : recommended;

      if (nextMatchBy === "name" && recommended !== "name") {
        nextMatchBy = recommended;
      }

      return { ...prev, matchBy: nextMatchBy };
    });
  }, [mapping.email, mapping.phone]);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setError(null);
      persistSession({ error: null });
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 90_000);
        const p = await apiClient.previewCallListImport(callListId, selectedFile, controller.signal);
        window.clearTimeout(timeout);

        const initialProgress = {
          phase: "READY" as const,
          totalRows: p.totalRows,
          processedRows: 0,
          matched: 0,
          created: 0,
          added: 0,
          duplicates: 0,
          errors: 0,
          updatedAt: new Date().toISOString(),
        };

        setPreview(p);
        setProgress(initialProgress);
        setPreviewPage(1);
        setStep("map");
        setImportSession(callListId, {
          step: "map",
          preview: {
            importId: p.importId,
            headers: p.headers,
            previewRows: p.previewRows ?? [],
            totalRows: p.totalRows,
            suggestions: p.suggestions,
            matchingStats: p.matchingStats,
          },
          mapping: { name: "", email: "", phone: "" },
          options: { matchBy: "email_or_phone", createNewStudents: true, skipDuplicates: true },
          progress: initialProgress,
          commitResult: null,
          error: null,
          includeCallerNotes: false,
        });

        toast.success(`File parsed — ${p.totalRows.toLocaleString()} rows ready to map.`);
      } catch (e: unknown) {
        const msg =
          (e as { name?: string } | null)?.name === "AbortError"
            ? "File processing is taking too long (90s). Please try a smaller file or CSV."
            : getErrorMessage(e, "Failed to upload file");
        setError(msg);
        setFile(null);
        persistSession({ error: msg });
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [callListId, persistSession, setImportSession]
  );

  const runCommit = useCallback(async () => {
    if (!preview) return;
    if (!mapping.name) {
      setNameError(true);
      toast.error("Please select the Name column before importing.");
      return;
    }
    setNameError(false);
    cancelledRef.current = false;
    commitResultRef.current = null;
    setError(null);
    setLoading(true);
    setStep("importing");
    setCommitResult(null);
    persistSession({ step: "importing", commitResult: null, error: null });

    try {
      const req: CommitImportRequest = {
        importId: preview.importId,
        columnMapping: {
          name: mapping.name,
          email: mapping.email || undefined,
          phone: mapping.phone || undefined,
        },
        matchBy: options.matchBy,
        createNewStudents: options.createNewStudents,
        skipDuplicates: options.skipDuplicates,
      };

      const started = await apiClient.startCallListImportCommit(callListId, req);
      setProgress(started.progress);

      let status = started.status;
      let safety = 0;

      while (!cancelledRef.current && status !== "COMPLETED" && status !== "FAILED") {
        safety += 1;
        if (safety > 2000) throw new Error("Import is taking too long. Please try again.");

        const processed = await apiClient.processCallListImportCommit(callListId, {
          importId: started.importId,
          chunkSize: 500,
        });
        status = processed.status;
        setProgress(processed.progress);

        if (processed.result) {
          commitResultRef.current = processed.result;
          setCommitResult(processed.result);
        }

        if (status !== "COMPLETED" && status !== "FAILED") {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (cancelledRef.current) {
        toast.message("Import cancelled");
        setStep("map");
        persistSession({ step: "map" });
        return;
      }

      if (status === "FAILED") {
        throw new Error(commitResultRef.current?.message || "Import failed");
      }

      // If completed but no result yet (edge case), do one final fetch
      if (status === "COMPLETED" && !commitResultRef.current) {
        const final = await apiClient.processCallListImportCommit(callListId, { importId: started.importId, chunkSize: 1 });
        if (final.result) {
          commitResultRef.current = final.result;
          setCommitResult(final.result);
        }
      }

      const finalResult = commitResultRef.current;
      toast.success("Import completed successfully!");
      setStep("done");
      // Persist with the synchronously captured result — avoids stale closure zeros
      persistSession({
        step: "done",
        commitResult: finalResult as CallListImportSession["commitResult"],
      });
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed to import");
      setError(msg);
      toast.error(msg);
      setStep("map");
      persistSession({ step: "map", error: msg });
    } finally {
      setLoading(false);
    }
  }, [callListId, mapping, options, persistSession, preview]);

  const resetToUpload = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setMapping({ name: "", email: "", phone: "" });
    setProgress(null);
    setCommitResult(null);
    setError(null);
    setNameError(false);
    setPreviewPage(1);
    setImportSession(callListId, undefined);
  }, [callListId, setImportSession]);

  const headers = preview?.headers || [];
  const previewRows = preview?.previewRows || [];
  const totalPreviewPages = Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE);
  const pagedRows = previewRows.slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE);

  // Columns to show in preview: mapped columns first, then rest, max 6
  const mappedCols = [mapping.name, mapping.email, mapping.phone].filter(Boolean) as string[];
  const otherCols = headers.filter((h) => !mappedCols.includes(h));
  const displayCols = [...mappedCols, ...otherCols].slice(0, 6);

  const matchingStats = preview?.matchingStats;

  const progressPct =
    (progress?.totalRows ?? 0) > 0
      ? Math.min(100, Math.round(((progress?.processedRows ?? 0) / (progress?.totalRows ?? 1)) * 100))
      : 0;

  const matchByOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [{ value: "name", label: "Name only" }];
    if (mapping.email) opts.push({ value: "email", label: "Email" });
    if (mapping.phone) opts.push({ value: "phone", label: "Phone" });
    if (mapping.email && mapping.phone) opts.push({ value: "email_or_phone", label: "Email or Phone (recommended)" });
    return opts;
  }, [mapping.email, mapping.phone]);

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <ImportStepper step={step} />

      {/* Global error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Upload ── */}
      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Upload a CSV or XLSX file containing student data. We will parse it and let you map the columns.
          </p>

          <FileUpload
            accept=".csv,.xlsx"
            maxSize={10 * 1024 * 1024}
            onFileSelect={handleFileSelect}
            disabled={loading}
            loading={loading}
            error={error || undefined}
          />

          {/* Tip box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)] text-sm text-[var(--groups1-text-secondary)]">
            <span className="text-base leading-none mt-0.5">💡</span>
            <div>
              <span className="font-medium text-[var(--groups1-text)]">Tip:</span> Include columns named{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--groups1-border)] text-xs font-mono">Name</code>,{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--groups1-border)] text-xs font-mono">Email</code>, and{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--groups1-border)] text-xs font-mono">Phone</code> for automatic column detection.
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={() => { onLockChange?.(false); onCancel(); }}
              disabled={loading}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Map Columns ── */}
      {step === "map" && (
        <div className="space-y-4">
          {/* Card 1 — Column mapping */}
          <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Map Your Columns</h3>
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">
                Match your file columns to student fields. Columns highlighted in teal appear in the preview below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--groups1-text)] mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <StyledSelect
                  value={mapping.name}
                  onChange={(v) => { setMapping((p) => ({ ...p, name: v })); setNameError(false); }}
                  options={headers}
                  placeholder="Select column"
                  error={nameError}
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Please select the Name column.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--groups1-text)] mb-1">Email</label>
                <StyledSelect
                  value={mapping.email || ""}
                  onChange={(v) => setMapping((p) => ({ ...p, email: v || undefined }))}
                  options={headers}
                  placeholder="None"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--groups1-text)] mb-1">Phone</label>
                <StyledSelect
                  value={mapping.phone || ""}
                  onChange={(v) => setMapping((p) => ({ ...p, phone: v || undefined }))}
                  options={headers}
                  placeholder="None"
                />
              </div>
            </div>
          </div>

          {/* Card 2 — File preview */}
          <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--groups1-border)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)]">File Preview</h3>
              <span className="text-xs text-[var(--groups1-text-secondary)]">
                {previewRows.length.toLocaleString()} rows · {headers.length} columns
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--groups1-secondary)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--groups1-text-secondary)] w-12">#</th>
                    {displayCols.map((h) => (
                      <th
                        key={`hdr-${h}`}
                        className={cn(
                          "text-left px-3 py-2 text-xs font-medium whitespace-nowrap",
                          mappedCols.includes(h)
                            ? "text-[var(--groups1-primary)] bg-[var(--groups1-primary)]/5"
                            : "text-[var(--groups1-text-secondary)]"
                        )}
                      >
                        {h}
                        {mappedCols.includes(h) && (
                          <span className="ml-1 text-[10px] font-normal opacity-70">
                            {h === mapping.name ? "(name)" : h === mapping.email ? "(email)" : "(phone)"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={displayCols.length + 1} className="px-3 py-6 text-center text-sm text-[var(--groups1-text-secondary)]">
                        No data rows found.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, idx) => (
                      <tr key={`row-${idx}`} className="border-t border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]/50">
                        <td className="px-3 py-2 text-xs text-[var(--groups1-text-secondary)] tabular-nums">
                          {(previewPage - 1) * PREVIEW_PAGE_SIZE + idx + 1}
                        </td>
                        {displayCols.map((h) => (
                          <td
                            key={`cell-${idx}-${h}`}
                            className={cn(
                              "px-3 py-2 text-[var(--groups1-text-secondary)] max-w-[200px] truncate",
                              mappedCols.includes(h) && "text-[var(--groups1-text)] font-medium"
                            )}
                            title={String((row as Record<string, unknown>)[h] ?? "")}
                          >
                            {String((row as Record<string, unknown>)[h] ?? "") || (
                              <span className="text-[var(--groups1-border)] italic text-xs">empty</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for preview */}
            {totalPreviewPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/50">
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  Showing {((previewPage - 1) * PREVIEW_PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(previewPage * PREVIEW_PAGE_SIZE, previewRows.length).toLocaleString()} of {previewRows.length.toLocaleString()} rows
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="h-7 px-2 text-xs border-[var(--groups1-border)] bg-[var(--groups1-surface)]"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-[var(--groups1-text)] px-2">
                    {previewPage} / {totalPreviewPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                    disabled={previewPage === totalPreviewPages}
                    className="h-7 px-2 text-xs border-[var(--groups1-border)] bg-[var(--groups1-surface)]"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card 3 — Import options + estimated stats */}
          <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Import Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-[var(--groups1-text)] mb-1">Match students by</label>
                <select
                  value={options.matchBy || "name"}
                  onChange={(e) => setOptions((p) => ({ ...p, matchBy: e.target.value as CommitImportRequest["matchBy"] }))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-[var(--groups1-surface)] text-[var(--groups1-text)] border-[var(--groups1-border)] hover:border-[var(--groups1-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] transition-colors"
                >
                  {matchByOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-5 md:mt-0 self-end pb-0.5">
                <input
                  type="checkbox"
                  checked={options.createNewStudents}
                  onChange={(e) => setOptions((p) => ({ ...p, createNewStudents: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] accent-[var(--groups1-primary)] cursor-pointer"
                />
                <div>
                  <span className="text-sm text-[var(--groups1-text)] font-medium">Create new students</span>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">Add students not already in your workspace</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer self-end pb-0.5">
                <input
                  type="checkbox"
                  checked={options.skipDuplicates}
                  onChange={(e) => setOptions((p) => ({ ...p, skipDuplicates: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] accent-[var(--groups1-primary)] cursor-pointer"
                />
                <div>
                  <span className="text-sm text-[var(--groups1-text)] font-medium">Skip duplicates</span>
                  <p className="text-xs text-[var(--groups1-text-secondary)]">Don't re-add students already in this call list</p>
                </div>
              </label>
            </div>

            {/* Estimated stats */}
            {matchingStats && (
              <>
                <div className="border-t border-[var(--groups1-border)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-2">
                    Expected results <span className="font-normal">(estimated)</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Will Match" value={matchingStats.willMatch} icon={Users} color="green" />
                    <StatCard label="Will Create" value={matchingStats.willCreate} icon={UserPlus} color="blue" />
                    <StatCard label="Will Skip" value={matchingStats.willSkip} icon={SkipForward} color="muted" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between pt-2 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={resetToUpload}
              disabled={loading}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={() => void runCommit()}
              disabled={loading || !mapping.name}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Start Import
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Importing ── */}
      {step === "importing" && (
        <div className="space-y-5 py-2">
          <div className="text-center">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-[var(--groups1-primary)] mb-3" />
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Importing students…</h3>
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
              {phaseLabel(progress?.phase)} Please keep this window open.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--groups1-text-secondary)]">
              <span className="font-mono tabular-nums">
                {(progress?.processedRows ?? 0).toLocaleString()} / {(progress?.totalRows ?? 0).toLocaleString()} rows
              </span>
              <span className="font-medium text-[var(--groups1-primary)]">{progressPct}%</span>
            </div>
            <div className="w-full bg-[var(--groups1-border)] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-[var(--groups1-primary)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progressPct, 3)}%` }}
              />
            </div>
          </div>

          {/* Live stats — only show if we have any data yet */}
          {(progress?.added ?? 0) + (progress?.created ?? 0) + (progress?.matched ?? 0) > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatCard label="Added to List" value={progress?.added ?? 0} icon={CheckCircle2} color="green" />
              <StatCard label="New Profiles" value={progress?.created ?? 0} icon={UserPlus} color="blue" />
              <StatCard label="Skipped" value={progress?.duplicates ?? 0} icon={SkipForward} color="muted" />
              <StatCard
                label="Errors"
                value={progress?.errors ?? 0}
                icon={XCircle}
                color={(progress?.errors ?? 0) > 0 ? "red" : "muted"}
              />
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cancelledRef.current = true;
                setStep("map");
                persistSession({ step: "map" });
              }}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === "done" && (
        <div className="space-y-5 py-2">
          {/* Success header */}
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <h3 className="text-base font-semibold text-[var(--groups1-text)]">Import Complete</h3>
            {(() => {
              const added = commitResult?.stats.added ?? progress?.added ?? 0;
              const created = commitResult?.stats.created ?? progress?.created ?? 0;
              const skipped = commitResult?.stats.duplicates ?? progress?.duplicates ?? 0;
              const errs = commitResult?.stats.errors ?? progress?.errors ?? 0;
              const parts: string[] = [];
              if (added > 0) parts.push(`${added.toLocaleString()} added to list`);
              if (created > 0) parts.push(`${created.toLocaleString()} new profile${created !== 1 ? "s" : ""} created`);
              if (skipped > 0) parts.push(`${skipped.toLocaleString()} skipped`);
              if (errs > 0) parts.push(`${errs.toLocaleString()} error${errs !== 1 ? "s" : ""}`);
              return (
                <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                  {parts.length > 0 ? parts.join(" · ") : "Import completed successfully!"}
                </p>
              );
            })()}
          </div>

          {/* Final stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Added to List" value={commitResult?.stats.added ?? progress?.added ?? 0} icon={CheckCircle2} color="green" />
            <StatCard label="New Profiles" value={commitResult?.stats.created ?? progress?.created ?? 0} icon={UserPlus} color="blue" />
            <StatCard label="Skipped" value={commitResult?.stats.duplicates ?? progress?.duplicates ?? 0} icon={SkipForward} color="muted" />
            <StatCard
              label="Errors"
              value={commitResult?.stats.errors ?? progress?.errors ?? 0}
              icon={XCircle}
              color={(commitResult?.stats.errors ?? progress?.errors ?? 0) > 0 ? "red" : "muted"}
            />
          </div>

          {/* Collapsible error list */}
          {!!commitResult?.errors?.length && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                onClick={() => setErrorsExpanded((p) => !p)}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {commitResult.errors.length} row{commitResult.errors.length !== 1 ? "s" : ""} had errors
                </span>
                {errorsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {errorsExpanded && (
                <ul className="px-4 pb-3 space-y-1 text-xs text-amber-700 dark:text-amber-300 max-h-48 overflow-y-auto">
                  {commitResult.errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={resetToUpload}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Import Another File
            </Button>
            <Button
              onClick={() => { onSuccess?.(); onLockChange?.(false); onCancel(); }}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
