"use client";

import type { Metadata } from "next";
import { useState, useEffect } from "react";
import { AuditLogsTable } from "@/components/audit-logs/AuditLogsTable";
import type { GetAuditLogsParams } from "@/types/audit-logs.types";

const FILTER_STORAGE_KEY = "audit-logs-filters";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<GetAuditLogsParams>({ page: 1, size: 20 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch {
        // Ignore parse errors, use default filters
      }
    }
    setIsLoaded(true);
  }, []);

  // Save filters to localStorage when they change
  const handleFiltersChange = (newFilters: GetAuditLogsParams) => {
    setFilters(newFilters);
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters));
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Audit Logs</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          View system activity and audit trail
        </p>
      </div>

      <AuditLogsTable
        params={filters}
        onParamsChange={handleFiltersChange}
      />
    </div>
  );
}

