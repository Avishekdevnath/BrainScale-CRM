"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, UserPlus, UserCheck, UserX, XCircle } from "lucide-react";
import type { CommitImportResponse } from "@/types/call-lists.types";

export interface ImportResultsProps {
  results: CommitImportResponse;
  onViewCallList: () => void;
  onClose: () => void;
}

export function ImportResults({
  results,
  onViewCallList,
  onClose,
}: ImportResultsProps) {
  const { stats, errors } = results;
  const hasErrors = errors && errors.length > 0;
  const isSuccess = stats.errors === 0;

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg border ${
        isSuccess
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      }`}>
        <div className="flex items-start gap-2">
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          )}
          <div className="flex-1">
            <h3 className={`font-medium mb-1 ${
              isSuccess
                ? "text-green-900 dark:text-green-100"
                : "text-yellow-900 dark:text-yellow-100"
            }`}>
              {isSuccess ? "Import completed successfully!" : "Import completed with some errors"}
            </h3>
            <p className={`text-sm ${
              isSuccess
                ? "text-green-700 dark:text-green-300"
                : "text-yellow-700 dark:text-yellow-300"
            }`}>
              {results.message}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--groups1-text)] mb-3">Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card variant="groups1">
            <CardContent variant="groups1" className="p-4 text-center">
              <UserCheck className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <div className="text-xl font-semibold text-[var(--groups1-text)]">{stats.matched}</div>
              <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">Matched</div>
            </CardContent>
          </Card>
          <Card variant="groups1">
            <CardContent variant="groups1" className="p-4 text-center">
              <UserPlus className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <div className="text-xl font-semibold text-[var(--groups1-text)]">{stats.created}</div>
              <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">Created</div>
            </CardContent>
          </Card>
          <Card variant="groups1">
            <CardContent variant="groups1" className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <div className="text-xl font-semibold text-[var(--groups1-text)]">{stats.added}</div>
              <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">Added</div>
            </CardContent>
          </Card>
          {stats.duplicates > 0 && (
            <Card variant="groups1">
              <CardContent variant="groups1" className="p-4 text-center">
                <UserX className="w-6 h-6 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                <div className="text-xl font-semibold text-[var(--groups1-text)]">{stats.duplicates}</div>
                <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">Duplicates</div>
              </CardContent>
            </Card>
          )}
          {stats.errors > 0 && (
            <Card variant="groups1">
              <CardContent variant="groups1" className="p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
                <div className="text-xl font-semibold text-[var(--groups1-text)]">{stats.errors}</div>
                <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">Errors</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {hasErrors && (
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
                    {error}
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
          onClick={onClose}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          Close
        </Button>
        <Button
          onClick={onViewCallList}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          View Call List
        </Button>
      </div>
    </div>
  );
}

