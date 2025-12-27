"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/useStudents";
import { useAvailableStudents } from "@/hooks/useAvailableStudents";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student, StudentsListParams } from "@/types/students.types";

export interface StudentSelectorProps {
  selectedStudentIds: string[];
  onSelectionChange: (studentIds: string[]) => void;
  callListId?: string; // If provided, uses available-students endpoint
  groupId?: string;
  groupIds?: string[]; // Multi-group filtering
  batchId?: string;
  courseId?: string;
  moduleId?: string;
  status?: StudentsListParams["status"];
  disabled?: boolean;
}

export function StudentSelector({
  selectedStudentIds,
  onSelectionChange,
  callListId,
  groupId,
  groupIds,
  batchId,
  courseId,
  moduleId,
  status,
  disabled = false,
}: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Use available-students endpoint if callListId is provided, otherwise use regular students endpoint
  const { data: availableStudentsData, isLoading: isLoadingAvailable } = useAvailableStudents(
    callListId || null,
    callListId
      ? {
          q: debouncedSearch || undefined,
          batchId,
          courseId,
          moduleId,
          status,
          page,
          size: pageSize,
        }
      : undefined
  );

  const { data: studentsData, isLoading: isLoadingStudents } = useStudents(
    !callListId
      ? {
          q: debouncedSearch || undefined,
          groupId: groupIds && groupIds.length > 0 ? undefined : groupId, // Use groupId only if no groupIds
          batchId,
          courseId,
          moduleId,
          status: status || undefined,
          page,
          size: pageSize,
        }
      : undefined
  );

  // Use the appropriate data source
  const data = callListId ? availableStudentsData : studentsData;
  const isLoading = callListId ? isLoadingAvailable : isLoadingStudents;

  const students = data?.students || [];
  const totalPages = data?.pagination.totalPages || 0;

  const handleToggleStudent = (studentId: string) => {
    if (disabled) return;
    if (selectedStudentIds.includes(studentId)) {
      onSelectionChange(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      onSelectionChange([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allIds = students.map((s) => s.id);
    const newSelection = [...new Set([...selectedStudentIds, ...allIds])];
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="flex-1 bg-[var(--groups1-background)] border-[var(--groups1-border)]"
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={disabled || students.length === 0}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={disabled || selectedStudentIds.length === 0}
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          Clear All
        </Button>
      </div>

      {selectedStudentIds.length > 0 && (
        <div className="text-sm text-[var(--groups1-text-secondary)]">
          {selectedStudentIds.length} {selectedStudentIds.length === 1 ? "student" : "students"} selected
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-sm text-[var(--groups1-text-secondary)]">
          No students found
        </div>
      ) : (
        <>
          <div className="max-h-96 overflow-y-auto border border-[var(--groups1-border)] rounded-lg">
            {students.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);
              const primaryPhone = student.phones.find((p) => p.isPrimary) || student.phones[0];
              return (
                <div
                  key={student.id}
                  onClick={() => handleToggleStudent(student.id)}
                  className={cn(
                    "p-3 border-b border-[var(--groups1-border)] cursor-pointer transition-colors",
                    isSelected
                      ? "bg-[var(--groups1-primary)] bg-opacity-10"
                      : "hover:bg-[var(--groups1-secondary)]",
                    disabled && "opacity-70 dark:opacity-75 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStudent(student.id)}
                      disabled={disabled}
                      className="rounded border-[var(--groups1-border)]"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--groups1-text)]">{student.name}</div>
                      <div className="text-sm text-[var(--groups1-text-secondary)]">
                        {student.email || "No email"}
                      </div>
                      {primaryPhone && (
                        <div className="text-xs text-[var(--groups1-text-secondary)]">
                          {primaryPhone.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || disabled}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--groups1-text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || disabled}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

