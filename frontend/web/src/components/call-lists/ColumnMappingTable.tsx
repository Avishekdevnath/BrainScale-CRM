"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ColumnMappingTableProps {
  headers: string[];
  previewRows: Record<string, any>[];
  suggestions: {
    name?: string;
    email?: string;
    phone?: string;
  };
  mapping: {
    name: string;
    email?: string;
    phone?: string;
  };
  onMappingChange: (mapping: { name: string; email?: string; phone?: string }) => void;
}

export function ColumnMappingTable({
  headers,
  previewRows,
  suggestions,
  mapping,
  onMappingChange,
}: ColumnMappingTableProps) {
  const handleMappingChange = (field: 'name' | 'email' | 'phone', column: string) => {
    const newMapping = { ...mapping };
    if (field === 'name') {
      newMapping.name = column;
    } else if (field === 'email') {
      newMapping.email = column || undefined;
    } else if (field === 'phone') {
      newMapping.phone = column || undefined;
    }
    onMappingChange(newMapping);
  };

  const isValid = mapping.name.length > 0;

  // Get preview data with mapped columns
  const mappedPreviewData = useMemo(() => {
    return previewRows.map((row) => ({
      name: mapping.name ? row[mapping.name] : "",
      email: mapping.email ? row[mapping.email] : "",
      phone: mapping.phone ? row[mapping.phone] : "",
    }));
  }, [previewRows, mapping]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
          Map columns from your file to student fields. The name field is required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Name Mapping */}
          <div>
            <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
              Name <span className="text-red-500">*</span>
            </Label>
            <select
              value={mapping.name}
              onChange={(e) => handleMappingChange('name', e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                suggestions.name && mapping.name === suggestions.name
                  ? "border-green-500 dark:border-green-400"
                  : "border-[var(--groups1-border)]"
              )}
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                  {suggestions.name === header && " (suggested)"}
                </option>
              ))}
            </select>
            {suggestions.name && mapping.name === suggestions.name && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-suggested</span>
              </div>
            )}
          </div>

          {/* Email Mapping */}
          <div>
            <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
              Email <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <select
              value={mapping.email || ""}
              onChange={(e) => handleMappingChange('email', e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                suggestions.email && mapping.email === suggestions.email
                  ? "border-green-500 dark:border-green-400"
                  : "border-[var(--groups1-border)]"
              )}
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                  {suggestions.email === header && " (suggested)"}
                </option>
              ))}
            </select>
            {suggestions.email && mapping.email === suggestions.email && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-suggested</span>
              </div>
            )}
          </div>

          {/* Phone Mapping */}
          <div>
            <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
              Phone <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <select
              value={mapping.phone || ""}
              onChange={(e) => handleMappingChange('phone', e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                suggestions.phone && mapping.phone === suggestions.phone
                  ? "border-green-500 dark:border-green-400"
                  : "border-[var(--groups1-border)]"
              )}
            >
              <option value="">Select column...</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                  {suggestions.phone === header && " (suggested)"}
                </option>
              ))}
            </select>
            {suggestions.phone && mapping.phone === suggestions.phone && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Auto-suggested</span>
              </div>
            )}
          </div>
        </div>

        {!isValid && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Please select a column for the Name field (required).
            </p>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {isValid && mappedPreviewData.length > 0 && (
        <div>
          <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
            Preview (first {previewRows.length} rows)
          </Label>
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
                  {mappedPreviewData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                    >
                      <td className="px-4 py-2 text-[var(--groups1-text)]">{row.name || "-"}</td>
                      {mapping.email && (
                        <td className="px-4 py-2 text-[var(--groups1-text)]">{row.email || "-"}</td>
                      )}
                      {mapping.phone && (
                        <td className="px-4 py-2 text-[var(--groups1-text)]">{row.phone || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

