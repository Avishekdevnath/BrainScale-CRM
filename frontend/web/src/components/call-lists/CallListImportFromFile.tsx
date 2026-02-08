"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUpload } from "@/components/common/FileUpload";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { CommitImportRequest, ImportPreviewResponse, ImportProgress, ProcessImportCommitResponse } from "@/types/call-lists.types";
import { cn } from "@/lib/utils";
import { useAddStudentsDialogStore, type CallListImportSession } from "@/store/add-students-dialog";

type Step = "upload" | "map" | "importing" | "done";

export interface CallListImportFromFileProps {
  callListId: string;
  onCancel: () => void;
  onSuccess?: () => void;
  onLockChange?: (locked: boolean) => void;
}

export function CallListImportFromFile({ callListId, onCancel, onSuccess, onLockChange }: CallListImportFromFileProps) {
  // Step 1: Upload file -> backend preview
  // Step 2: Show columns + mapping
  // Step 3: Commit import (progress)
  const storedSession = useAddStudentsDialogStore((s) => s.byCallListId[callListId]?.importSession);
  const setImportSession = useAddStudentsDialogStore((s) => s.setImportSession);

  const [step, setStep] = useState<Step>(() => (storedSession?.step as Step | undefined) ?? "upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(() => (storedSession?.preview as any) ?? null);
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
  const [progress, setProgress] = useState<ImportProgress | null>(() => (storedSession?.progress as any) ?? null);
  const [commitResult, setCommitResult] = useState<ProcessImportCommitResponse["result"] | null>(() => (storedSession?.commitResult as any) ?? null);
  const cancelledRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    onLockChange?.(true);
    return () => {
      onLockChange?.(false);
    };
  }, [onLockChange]);

  // If this component is remounted while an import session is active, hydrate local UI state from the store.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!storedSession) {
      hydratedRef.current = true;
      return;
    }

    // Restore the mapping/preview step so the user can continue.
    setStep((storedSession.step as Step | undefined) ?? "upload");
    setPreview((storedSession.preview as any) ?? null);
    setMapping({ ...(storedSession.mapping ?? {}), name: "", email: "", phone: "" });
    setOptions({
      matchBy: storedSession.options?.matchBy ?? "email_or_phone",
      createNewStudents: storedSession.options?.createNewStudents ?? true,
      skipDuplicates: storedSession.options?.skipDuplicates ?? true,
    });
    setProgress((storedSession.progress as any) ?? null);
    setCommitResult((storedSession.commitResult as any) ?? null);
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
          matchBy: (options.matchBy ?? "email_or_phone") as any,
          createNewStudents: options.createNewStudents,
          skipDuplicates: options.skipDuplicates,
        },
        progress,
        commitResult: commitResult as any,
        error,
      };

      const merged = mode === "replace" ? (partial as CallListImportSession) : { ...next, ...(partial ?? {}) };
      setImportSession(callListId, merged);
    },
    [callListId, commitResult, error, mapping, options.createNewStudents, options.matchBy, options.skipDuplicates, preview, progress, setImportSession, step]
  );

  // Persist important state changes so an unexpected remount doesn't lose the session.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (step === "upload" && !preview && !error && !progress && !commitResult) {
      // Don't create store entries for the initial empty state.
      return;
    }
    persistSession();
  }, [commitResult, error, persistSession, preview, progress, step]);

  useEffect(() => {
    if (!preview?.suggestions) return;
    setMapping((prev) => {
      // Keep user selection if already set
      if (prev.name) return prev;
      return {
        name: preview.suggestions.name || "",
        email: preview.suggestions.email || "",
        phone: preview.suggestions.phone || "",
      };
    });
  }, [preview]);

  useEffect(() => {
    // When mapping changes, ensure matchBy is compatible with available columns
    setOptions((prev) => {
      const allowed: Array<NonNullable<CommitImportRequest["matchBy"]>> = ["name"];
      if (mapping.email) allowed.push("email");
      if (mapping.phone) allowed.push("phone");
      if (mapping.email && mapping.phone) allowed.push("email_or_phone");

      const nextMatchBy = prev.matchBy && allowed.includes(prev.matchBy) ? prev.matchBy : allowed[allowed.length - 1];
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
        setPreview(p);
        setProgress(p ? { phase: "READY", totalRows: p.totalRows, processedRows: 0, matched: 0, created: 0, added: 0, duplicates: 0, errors: 0, updatedAt: new Date().toISOString() } : null);
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
          mapping: {
            name: "",
            email: "",
            phone: "",
          },
          options: {
            matchBy: "email_or_phone",
            createNewStudents: true,
            skipDuplicates: true,
          },
          progress: p ? { phase: "READY", totalRows: p.totalRows, processedRows: 0, matched: 0, created: 0, added: 0, duplicates: 0, errors: 0, updatedAt: new Date().toISOString() } : null,
          commitResult: null,
          error: null,
        });
        toast.success("File uploaded. Please confirm the columns.");
      } catch (e: any) {
        const msg =
          e?.name === "AbortError"
            ? "File processing is taking too long (90s). Please try a smaller file or CSV."
            : e?.message || e?.error?.message || "Failed to upload file";
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

  const canNext = useMemo(() => {
    if (step === "upload") return !!file && !loading;
    if (step === "map") return !!mapping.name && !loading;
    if (step === "importing") return false;
    if (step === "done") return true;
    return false;
  }, [file, loading, mapping.name, step]);

  const handleBack = useCallback(() => {
    if (loading) return;
    if (step === "upload") {
      onLockChange?.(false);
      onCancel();
      return;
    }
    if (step === "map") {
      setStep("upload");
      setFile(null);
      setPreview(null);
      setMapping({ name: "", email: "", phone: "" });
      setProgress(null);
      setCommitResult(null);
      setError(null);
      setImportSession(callListId, undefined);
      return;
    }
    if (step === "done") {
      onLockChange?.(false);
      onCancel();
      return;
    }
  }, [callListId, loading, onCancel, onLockChange, setImportSession, step]);

  const runCommit = useCallback(async () => {
    if (!preview) return;
    if (!mapping.name) {
      toast.error("Please select the Name column");
      return;
    }

    cancelledRef.current = false;
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
      persistSession({ progress: started.progress });

      let status = started.status;
      let lastResult: ProcessImportCommitResponse["result"] | null = null;
      let safety = 0;
      while (!cancelledRef.current && status !== "COMPLETED" && status !== "FAILED") {
        safety += 1;
        if (safety > 2000) throw new Error("Import is taking too long. Please try again.");

        const processed = await apiClient.processCallListImportCommit(callListId, {
          importId: started.importId,
          // Backend validation currently limits chunkSize to max 250
          chunkSize: 250,
        });
        status = processed.status;
        setProgress(processed.progress);
        persistSession({ progress: processed.progress });
        if (processed.result) {
          lastResult = processed.result;
          setCommitResult(processed.result);
          persistSession({ commitResult: processed.result as any });
        }

        if (status !== "COMPLETED" && status !== "FAILED") {
          // Small yield to keep UI responsive
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      if (cancelledRef.current) {
        toast.message("Import cancelled");
        setStep("map");
        persistSession({ step: "map" });
        return;
      }

      if (status === "COMPLETED" && !lastResult) {
        const final = await apiClient.processCallListImportCommit(callListId, {
          importId: started.importId,
        });
        setProgress(final.progress);
        persistSession({ progress: final.progress });
        if (final.result) {
          lastResult = final.result;
          setCommitResult(final.result);
          persistSession({ commitResult: final.result as any });
        }
      }

      if (status === "FAILED") {
        throw new Error(lastResult?.message || "Import failed");
      }

      toast.success("Import completed");
      setStep("done");
      persistSession({ step: "done" });
    } catch (e: any) {
      const msg = e?.message || e?.error?.message || "Failed to import";
      setError(msg);
      toast.error(msg);
      setStep("map");
      persistSession({ step: "map", error: msg });
    } finally {
      setLoading(false);
    }
  }, [callListId, mapping.email, mapping.name, mapping.phone, options.createNewStudents, options.matchBy, options.skipDuplicates, persistSession, preview]);

  const handleNext = useCallback(() => {
    if (loading) return;
    if (step === "map") {
      void runCommit();
      return;
    }
    if (step === "done") {
      onSuccess?.();
      onLockChange?.(false);
      onCancel();
    }
  }, [loading, onCancel, onLockChange, onSuccess, runCommit, step]);

  const headers = preview?.headers || [];
  const previewRows = preview?.previewRows || [];

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Upload a CSV or XLSX file. We will parse and show a preview so you can map columns.
          </p>
          <FileUpload
            accept=".csv,.xlsx"
            maxSize={10 * 1024 * 1024}
            onFileSelect={handleFileSelect}
            disabled={loading}
            error={error || undefined}
          />
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
              <span className="ml-2 text-sm text-[var(--groups1-text-secondary)]">Processing file...</span>
            </div>
          )}
        </div>
      )}

      {step === "map" && preview && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--groups1-text-secondary)]">
            Confirm which columns represent Name (required), Email, and Phone. Then we will import.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <select
                value={mapping.name}
                onChange={(e) => setMapping((m) => ({ ...m, name: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "border-[var(--groups1-border)]"
                )}
              >
                <option value="">Select column...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                    {preview.suggestions?.name === h ? " (suggested)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Email <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                value={mapping.email || ""}
                onChange={(e) => setMapping((m) => ({ ...m, email: e.target.value || "" }))}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "border-[var(--groups1-border)]"
                )}
              >
                <option value="">Select column...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                    {preview.suggestions?.email === h ? " (suggested)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Phone <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <select
                value={mapping.phone || ""}
                onChange={(e) => setMapping((m) => ({ ...m, phone: e.target.value || "" }))}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "border-[var(--groups1-border)]"
                )}
              >
                <option value="">Select column...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                    {preview.suggestions?.phone === h ? " (suggested)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">Match by</label>
              <select
                value={options.matchBy || "name"}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, matchBy: (e.target.value as CommitImportRequest["matchBy"]) || "name" }))
                }
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "border-[var(--groups1-border)]"
                )}
              >
                <option value="name">Name</option>
                {!!mapping.email && <option value="email">Email</option>}
                {!!mapping.phone && <option value="phone">Phone</option>}
                {!!mapping.email && !!mapping.phone && <option value="email_or_phone">Email or Phone</option>}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                <input
                  type="checkbox"
                  checked={options.createNewStudents}
                  onChange={(e) => setOptions((o) => ({ ...o, createNewStudents: e.target.checked }))}
                />
                Create new students
              </label>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                <input
                  type="checkbox"
                  checked={options.skipDuplicates}
                  onChange={(e) => setOptions((o) => ({ ...o, skipDuplicates: e.target.checked }))}
                />
                Skip duplicates in call list
              </label>
            </div>
          </div>

          {mapping.name && previewRows.length > 0 && (
            <div>
              <div className="text-sm font-medium text-[var(--groups1-text)] mb-2">
                Preview (first {previewRows.length} rows)
              </div>
              <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--groups1-secondary)]">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-[var(--groups1-text)]">Name</th>
                        {mapping.email && (
                          <th className="px-4 py-2 text-left font-medium text-[var(--groups1-text)]">Email</th>
                        )}
                        {mapping.phone && (
                          <th className="px-4 py-2 text-left font-medium text-[var(--groups1-text)]">Phone</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-[var(--groups1-border)]">
                          <td className="px-4 py-2 text-[var(--groups1-text)]">{row[mapping.name] ?? "-"}</td>
                          {mapping.email && (
                            <td className="px-4 py-2 text-[var(--groups1-text)]">{row[mapping.email] ?? "-"}</td>
                          )}
                          {mapping.phone && (
                            <td className="px-4 py-2 text-[var(--groups1-text)]">{row[mapping.phone] ?? "-"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-2 text-xs text-[var(--groups1-text-secondary)]">
                Expected: {preview.matchingStats.willMatch} matched, {preview.matchingStats.willCreate} created,{" "}
                {preview.matchingStats.willSkip} skipped.
              </div>
            </div>
          )}
        </div>
      )}

      {step === "importing" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--groups1-primary)]" />
            Importing…
          </div>
          {progress && (
            <div className="space-y-2">
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                Phase: {progress.phase} • {progress.processedRows}/{progress.totalRows}
              </div>
              <div className="w-full h-2 bg-[var(--groups1-secondary)] rounded">
                <div
                  className="h-2 bg-[var(--groups1-primary)] rounded"
                  style={{
                    width:
                      progress.totalRows > 0
                        ? `${Math.min(100, Math.round((progress.processedRows / progress.totalRows) * 100))}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-[var(--groups1-text-secondary)]">
                <div>Matched: {progress.matched}</div>
                <div>Created: {progress.created}</div>
                <div>Added: {progress.added}</div>
                <div>Duplicates: {progress.duplicates}</div>
                <div>Errors: {progress.errors}</div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                cancelledRef.current = true;
              }}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel Import
            </Button>
          </div>
        </div>
      )}

      {step === "done" && commitResult && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-[var(--groups1-text)]">{commitResult.message}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-[var(--groups1-text-secondary)]">
            <div>Matched: {commitResult.stats.matched}</div>
            <div>Created: {commitResult.stats.created}</div>
            <div>Added: {commitResult.stats.added}</div>
            <div>Duplicates: {commitResult.stats.duplicates}</div>
            <div>Errors: {commitResult.stats.errors}</div>
          </div>
          {!!commitResult.errors?.length && (
            <div className="text-xs text-[var(--groups1-text-secondary)]">
              {commitResult.errors.slice(0, 10).map((e, idx) => (
                <div key={idx} className="truncate">
                  {e}
                </div>
              ))}
              {commitResult.errors.length > 10 && <div>…and {commitResult.errors.length - 10} more</div>}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between pt-4 border-t border-[var(--groups1-border)]">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading || step === "importing"}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canNext || step === "importing"}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          {step === "done" ? "Done" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
