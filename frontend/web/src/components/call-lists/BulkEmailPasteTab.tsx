"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EmailPasteInput } from "./EmailPasteInput";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import { parseEmails } from "@/lib/email-utils";
import type { BulkEmailPasteResponse } from "@/types/call-lists.types";

export interface BulkEmailPasteTabProps {
  callListId: string;
  groupId?: string;
  batchId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function BulkEmailPasteTab({
  callListId,
  groupId,
  batchId,
  onSuccess,
  onCancel,
}: BulkEmailPasteTabProps) {
  const [emailText, setEmailText] = useState("");
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<BulkEmailPasteResponse | null>(null);
  const [createNewStudents, setCreateNewStudents] = useState(true);

  const handleValidationChange = useCallback((valid: boolean, emails: string[]) => {
    setIsValid(valid);
    setParsedEmails(emails);
  }, []);

  const handleSubmit = async () => {
    if (!isValid || parsedEmails.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.bulkPasteEmailsToCallList(callListId, {
        emails: parsedEmails,
        groupId,
        batchId,
        createNewStudents,
        enrollToGroup: !!groupId,
        assignToBatch: !!batchId,
      });

      setResults(response);
      
      // Show success toast with statistics
      const { stats } = response;
      const successMessage = [
        `${stats.added} student${stats.added !== 1 ? "s" : ""} added to call list`,
        stats.matched > 0 && `${stats.matched} existing student${stats.matched !== 1 ? "s" : ""} found`,
        stats.created > 0 && `${stats.created} new student${stats.created !== 1 ? "s" : ""} created`,
        stats.errors > 0 && `${stats.errors} error${stats.errors !== 1 ? "s" : ""} occurred`,
      ]
        .filter(Boolean)
        .join(", ");

      if (stats.errors === 0) {
        toast.success(successMessage);
      } else {
        toast.warning(successMessage);
      }

      // Clear input on success
      setEmailText("");
      setParsedEmails([]);
      setIsValid(false);
    } catch (error: any) {
      console.error("Bulk email paste error:", error);
      const errorMessage =
        error?.message || error?.error?.message || "Failed to add students";
      
      if (error?.status === 403) {
        toast.error("Access denied");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmailText("");
    setParsedEmails([]);
    setIsValid(false);
    setResults(null);
  };

  const enrollmentInfo = useMemo(() => {
    const parts: string[] = [];
    if (groupId) {
      parts.push("enrolled to the selected group");
    }
    if (batchId) {
      parts.push("assigned to the selected batch");
    }
    return parts.length > 0 ? ` and will be ${parts.join(" and ")}` : "";
  }, [groupId, batchId]);

  if (results) {
    const { stats, errors } = results;
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                Students Added Successfully
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-green-700 dark:text-green-300 font-medium">{stats.added}</div>
                  <div className="text-green-600 dark:text-green-400 text-xs">Added to List</div>
                </div>
                {stats.matched > 0 && (
                  <div>
                    <div className="text-green-700 dark:text-green-300 font-medium">{stats.matched}</div>
                    <div className="text-green-600 dark:text-green-400 text-xs">Existing Found</div>
                  </div>
                )}
                {stats.created > 0 && (
                  <div>
                    <div className="text-green-700 dark:text-green-300 font-medium">{stats.created}</div>
                    <div className="text-green-600 dark:text-green-400 text-xs">New Created</div>
                  </div>
                )}
                {stats.enrolled > 0 && (
                  <div>
                    <div className="text-green-700 dark:text-green-300 font-medium">{stats.enrolled}</div>
                    <div className="text-green-600 dark:text-green-400 text-xs">Enrolled</div>
                  </div>
                )}
                {stats.assigned > 0 && (
                  <div>
                    <div className="text-green-700 dark:text-green-300 font-medium">{stats.assigned}</div>
                    <div className="text-green-600 dark:text-green-400 text-xs">Assigned</div>
                  </div>
                )}
                {stats.duplicates > 0 && (
                  <div>
                    <div className="text-yellow-700 dark:text-yellow-300 font-medium">{stats.duplicates}</div>
                    <div className="text-yellow-600 dark:text-yellow-400 text-xs">Duplicates</div>
                  </div>
                )}
                {stats.skipped > 0 && (
                  <div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">{stats.skipped}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Skipped</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {errors && errors.length > 0 && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">
                  Errors ({errors.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-medium">{error.email}:</span> {error.message}
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      +{errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
          <Button
            variant="outline"
            onClick={handleReset}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            Add More
          </Button>
          <Button
            onClick={() => {
              handleReset();
              onSuccess();
            }}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--groups1-text-secondary)]">
        Paste email addresses below. New students will be automatically created{enrollmentInfo}.
        Existing students will be added to the call list.
      </p>

      <EmailPasteInput
        value={emailText}
        onChange={setEmailText}
        onValidationChange={handleValidationChange}
        disabled={isSubmitting}
      />

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={createNewStudents}
            onChange={(e) => setCreateNewStudents(e.target.checked)}
            disabled={isSubmitting}
            className="rounded border-[var(--groups1-border)]"
          />
          <span className="text-sm text-[var(--groups1-text)]">
            Create new students if not found
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid || parsedEmails.length === 0}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add {parsedEmails.length > 0 ? `${parsedEmails.length} ` : ""}Students
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

