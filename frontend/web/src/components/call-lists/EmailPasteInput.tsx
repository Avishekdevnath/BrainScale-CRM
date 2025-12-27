"use client";

import { useState, useEffect, useCallback } from "react";
import { parseEmails } from "@/lib/email-utils";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface EmailPasteInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, parsedEmails: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function EmailPasteInput({
  value,
  onChange,
  onValidationChange,
  disabled = false,
  placeholder = "Paste emails here (one per line, comma-separated, or space-separated)\nExample:\nuser1@example.com\nuser2@example.com, user3@example.com",
}: EmailPasteInputProps) {
  const [parsedResult, setParsedResult] = useState<{
    emails: string[];
    invalid: string[];
    duplicates: string[];
  }>({ emails: [], invalid: [], duplicates: [] });

  // Parse emails whenever value changes
  useEffect(() => {
    if (value.trim()) {
      const result = parseEmails(value);
      setParsedResult(result);
      onValidationChange?.(result.emails.length > 0, result.emails);
    } else {
      setParsedResult({ emails: [], invalid: [], duplicates: [] });
      onValidationChange?.(false, []);
    }
  }, [value, onValidationChange]);

  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  const isValid = parsedResult.emails.length > 0;
  const hasErrors = parsedResult.invalid.length > 0 || parsedResult.duplicates.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={8}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y",
            "placeholder:text-[var(--groups1-text-secondary)]",
            isValid && !hasErrors
              ? "border-green-500 dark:border-green-400"
              : hasErrors
              ? "border-red-500 dark:border-red-400"
              : "border-[var(--groups1-border)]",
            disabled && "opacity-70 dark:opacity-75 cursor-not-allowed"
          )}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            aria-label="Clear input"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Statistics */}
      {value.trim() && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            {parsedResult.emails.length > 0 && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>{parsedResult.emails.length} valid email{parsedResult.emails.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {parsedResult.invalid.length > 0 && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>{parsedResult.invalid.length} invalid</span>
              </div>
            )}
            {parsedResult.duplicates.length > 0 && (
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span>{parsedResult.duplicates.length} duplicate{parsedResult.duplicates.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Show invalid emails */}
          {parsedResult.invalid.length > 0 && (
            <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Invalid emails:</p>
              <div className="flex flex-wrap gap-1">
                {parsedResult.invalid.slice(0, 10).map((email, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                  >
                    {email}
                  </span>
                ))}
                {parsedResult.invalid.length > 10 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    +{parsedResult.invalid.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Show duplicate emails */}
          {parsedResult.duplicates.length > 0 && (
            <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Duplicate emails (will be deduplicated):
              </p>
              <div className="flex flex-wrap gap-1">
                {parsedResult.duplicates.slice(0, 10).map((email, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                  >
                    {email}
                  </span>
                ))}
                {parsedResult.duplicates.length > 10 && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    +{parsedResult.duplicates.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

