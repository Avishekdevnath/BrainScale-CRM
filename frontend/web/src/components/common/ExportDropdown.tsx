"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudentExportFormat } from "@/lib/student-export";

type ExportOption = {
  value: StudentExportFormat;
  label: string;
};

type ExportDropdownProps = {
  onSelect: (format: StudentExportFormat) => void;
  options?: ExportOption[];
  triggerLabel?: string;
  isExporting?: boolean;
  pendingFormat?: StudentExportFormat;
  className?: string;
};

const DEFAULT_OPTIONS: ExportOption[] = [
  { value: "csv", label: "Export CSV" },
  { value: "xlsx", label: "Export XLSX" },
  { value: "pdf", label: "Export PDF" },
];

export function ExportDropdown({
  onSelect,
  options = DEFAULT_OPTIONS,
  triggerLabel = "Export",
  isExporting = false,
  pendingFormat,
  className,
}: ExportDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          disabled={isExporting}
          className={cn(
            "border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
            className
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {pendingFormat ? `Exporting ${pendingFormat.toUpperCase()}…` : "Exporting…"}
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              {triggerLabel}
            </>
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "min-w-[180px] rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg z-50"
          )}
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--groups1-text)] cursor-pointer",
                "hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)] outline-none"
              )}
              onSelect={(event) => {
                if (isExporting) {
                  event.preventDefault();
                  return;
                }
                onSelect(option.value);
              }}
            >
              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}


