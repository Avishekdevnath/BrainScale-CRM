"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
}

interface ChartDataTableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function ChartDataTable({ columns, data, className }: ChartDataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--groups1-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-semibold text-[var(--groups1-text)] bg-[var(--groups1-secondary)]"
              >
                <button
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "flex items-center gap-2",
                    col.sortable && "hover:text-[var(--groups1-primary)] cursor-pointer"
                  )}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <ArrowUpDown
                      className={cn("w-4 h-4", sortDir === "asc" && "rotate-180")}
                    />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[var(--groups1-text-secondary)]"
              >
                No data available
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[var(--groups1-text)]">
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
