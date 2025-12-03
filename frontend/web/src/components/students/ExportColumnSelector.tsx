"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportColumn {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

const AVAILABLE_COLUMNS: ExportColumn[] = [
  {
    key: "student.name",
    label: "Name",
    description: "Student full name",
    default: true,
  },
  {
    key: "student.email",
    label: "Email",
    description: "Student email address",
    default: true,
  },
  {
    key: "student.discordId",
    label: "Discord ID",
    description: "Discord handle or ID",
    default: false,
  },
  {
    key: "phone.0",
    label: "Primary Phone",
    description: "Primary phone number",
    default: true,
  },
  {
    key: "phone.1",
    label: "Secondary Phone",
    description: "Secondary phone number",
    default: false,
  },
  {
    key: "phone.primary",
    label: "Primary Phone (Named)",
    description: "Primary phone (named format)",
    default: false,
  },
  {
    key: "student.tags",
    label: "Tags",
    description: "Student tags (pipe-separated)",
    default: true,
  },
  {
    key: "enrollment.groupName",
    label: "Group Name",
    description: "Group name from enrollment",
    default: false,
  },
  {
    key: "enrollment.courseName",
    label: "Course Name",
    description: "Course name from enrollment",
    default: false,
  },
  {
    key: "enrollment.status",
    label: "Status",
    description: "Student status for the group",
    default: false,
  },
  {
    key: "batch.names",
    label: "Batch Names",
    description: "Comma-separated batch names",
    default: false,
  },
  {
    key: "batch.ids",
    label: "Batch IDs",
    description: "Comma-separated batch IDs",
    default: false,
  },
];

const STORAGE_KEY = "students-export-columns";

interface ExportColumnSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (columns: string[]) => void;
  defaultColumns?: string[];
}

export function ExportColumnSelector({
  open,
  onOpenChange,
  onConfirm,
  defaultColumns,
}: ExportColumnSelectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    // Try to load from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    // Use default columns or provided defaults
    return (
      defaultColumns ||
      AVAILABLE_COLUMNS.filter((col) => col.default).map((col) => col.key)
    );
  });

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedColumns(parsed);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const handleToggle = (columnKey: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnKey)) {
        // Don't allow deselecting all columns
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((key) => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  const handleConfirm = () => {
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedColumns));
    }
    onConfirm(selectedColumns);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaults = AVAILABLE_COLUMNS.filter((col) => col.default).map((col) => col.key);
    setSelectedColumns(defaults);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[var(--groups1-surface)] border border-[var(--groups1-border)]">
        <DialogHeader>
          <DialogTitle>Select Export Columns</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Choose which columns to include in your export. At least one column must be selected.
          </p>

          <div className="space-y-2">
            {AVAILABLE_COLUMNS.map((column) => {
              const isSelected = selectedColumns.includes(column.key);
              return (
                <div
                  key={column.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isSelected
                      ? "bg-[var(--groups1-primary)]/10 border-[var(--groups1-primary)]"
                      : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                  )}
                  onClick={() => handleToggle(column.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(column.key);
                    }
                  }}
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${column.label}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--groups1-primary)]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--groups1-border)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-[var(--groups1-text)] cursor-pointer">
                        {column.label}
                      </Label>
                      {column.default && (
                        <span className="text-xs text-[var(--groups1-text-secondary)] bg-[var(--groups1-secondary)] px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                      {column.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--groups1-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="text-sm"
            >
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={selectedColumns.length === 0}
                className="text-sm bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                Export ({selectedColumns.length} {selectedColumns.length === 1 ? "column" : "columns"})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

