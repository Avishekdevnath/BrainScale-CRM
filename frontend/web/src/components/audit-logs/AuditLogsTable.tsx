"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import type { GetAuditLogsParams } from "@/types/audit-logs.types";

interface AuditLogsTableProps {
  params?: GetAuditLogsParams;
  onParamsChange?: (params: GetAuditLogsParams) => void;
}

function getActionBadgeColor(action: string): string {
  if (action.startsWith("MEMBER_")) return "bg-blue-100 text-blue-800";
  if (action.startsWith("WORKSPACE_")) return "bg-purple-100 text-purple-800";
  if (action.startsWith("USER_")) return "bg-green-100 text-green-800";
  if (action.startsWith("CALL_LIST_")) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function renderMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";

  // Handle call list updates with detailed changes
  if (metadata.changes && typeof metadata.changes === "object") {
    const changes = metadata.changes as Record<string, any>;
    const changeItems = Object.entries(changes)
      .map(([field, change]) => {
        if (typeof change === "object" && change.from !== undefined && change.to !== undefined) {
          return `${field}: "${change.from}" → "${change.to}"`;
        }
        return null;
      })
      .filter(Boolean);

    if (changeItems.length > 0) {
      return changeItems.join("; ");
    }
  }

  // Handle call list item removal
  if (metadata.callListId && metadata.studentName) {
    return `Removed: ${metadata.studentName}`;
  }

  // Handle other metadata
  const entries = Object.entries(metadata)
    .filter(([key]) => key !== "changes" && key !== "callListId") // Skip already handled fields
    .map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        return `${key}: ${value}`;
      }
      return null;
    })
    .filter(Boolean);

  return entries.length > 0 ? entries.join(", ") : "—";
}

function truncateText(text: string, maxLength: number = 30): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

export function AuditLogsTable({ params, onParamsChange }: AuditLogsTableProps) {
  const { data, isLoading, error } = useAuditLogs(params);
  const currentPage = params?.page || 1;

  const handlePreviousPage = () => {
    if (currentPage > 1 && onParamsChange) {
      onParamsChange({ ...params, page: currentPage - 1 });
    }
  };

  const handleNextPage = () => {
    if (data?.pagination && currentPage < data.pagination.totalPages && onParamsChange) {
      onParamsChange({ ...params, page: currentPage + 1 });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
        Failed to load audit logs. Please try again.
      </div>
    );
  }

  if (!data?.logs || data.logs.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-8 text-center text-[var(--groups1-text-secondary)]">
        No audit logs found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--groups1-border)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)] w-[160px]">
                  Time
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)] w-[150px]">
                  Actor
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)] w-[140px]">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)] w-[120px]">
                  Entity
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                >
                  <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                    <div className="truncate" title={log.user.name || log.user.email}>
                      {log.user.name || log.user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {formatActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                    <div className="truncate" title={log.entity}>
                      {log.entity}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                    <div title={renderMetadata(log.metadata)}>
                      {truncateText(renderMetadata(log.metadata))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4">
          <div className="text-sm text-[var(--groups1-text-secondary)]">
            Page {data.pagination.page} of {data.pagination.totalPages} • {data.pagination.total} total
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= data.pagination.totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
