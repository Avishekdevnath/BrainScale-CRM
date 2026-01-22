"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useCallLogs, useCallLog } from "@/hooks/useCallLogs";
import { useGroups } from "@/hooks/useGroups";
import { useCallLists } from "@/hooks/useCallLists";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CallLogDetailsModal } from "@/components/call-lists/CallLogDetailsModal";
import { formatCallDuration, getStatusLabel, getStatusColor } from "@/lib/call-list-utils";
import { Loader2, Search, X, ChevronLeft, ChevronRight, Eye, MoreVertical, Pencil, RefreshCw } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EditCallLogDialog } from "@/components/call-lists/EditCallLogDialog";
import { mutate } from "swr";
import { cn } from "@/lib/utils";
import type { CallLogStatus, CallLog } from "@/types/call-lists.types";

function CallLogsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId") || null);
  const [callListId, setCallListId] = useState<string | null>(searchParams.get("callListId") || null);
  const [status, setStatus] = useState<CallLogStatus | null>(() => {
    const statusParam = searchParams.get("status");
    if (!statusParam) return null;
    const validStatuses: CallLogStatus[] = ["completed", "missed", "busy", "no_answer", "voicemail", "other"];
    return validStatuses.includes(statusParam as CallLogStatus) ? (statusParam as CallLogStatus) : null;
  });
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CallLog | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  usePageTitle("Call Logs");

  const { data: logsData, error, isLoading, mutate: mutateLogs } = useCallLogs({
    page,
    size: 20,
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    callListId: callListId || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: selectedLog } = useCallLog(selectedLogId);
  const { data: groups } = useGroups();
  const { data: callListsData } = useCallLists();

  const logs = logsData?.logs || [];
  const pagination = logsData?.pagination || { page: 1, size: 20, total: 0, totalPages: 0 };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (batchId) params.set("batchId", batchId);
    if (groupId) params.set("groupId", groupId);
    if (callListId) params.set("callListId", callListId);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (searchQuery) params.set("q", searchQuery);
    const newUrl = params.toString() ? `/app/call-logs?${params.toString()}` : "/app/call-logs";
    router.replace(newUrl, { scroll: false });
  }, [page, batchId, groupId, callListId, status, dateFrom, dateTo, searchQuery, router]);

  const handleViewDetails = (logId: string) => {
    setSelectedLogId(logId);
    setIsDetailsModalOpen(true);
  };

  const handleEditCall = (log: CallLog) => {
    setEditingLog(log);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = async () => {
    await mutateLogs();
    setEditingLog(null);
    // Invalidate dashboard cache to refresh stats
    await mutate(
      (key) => typeof key === "string" && key.startsWith("dashboard/"),
      undefined,
      { revalidate: true }
    );
  };

  const clearFilters = () => {
    setBatchId(null);
    setGroupId(null);
    setCallListId(null);
    setStatus(null);
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = batchId || groupId || callListId || status || dateFrom || dateTo || searchQuery;

  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.student?.name.toLowerCase().includes(query) ||
      log.student?.email?.toLowerCase().includes(query) ||
      log.callList?.name.toLowerCase().includes(query)
    );
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Logs</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
            Review outcomes and notes from calls
          </p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load call logs"}
            </p>
            <Button
              onClick={() => mutateLogs()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = async () => {
    await mutateLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Logs</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
            Review outcomes and notes from calls
          </p>
        </div>
        <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
      </div>

      {/* Filters */}
      <CollapsibleFilters open={showFilters} contentClassName="pt-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Search
            </label>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--groups1-text-secondary)]" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or call list"
                className={cn("pl-9", "bg-[var(--groups1-surface)]")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Batch
            </label>
            <BatchFilter
              value={batchId}
              onChange={(value) => {
                setBatchId(value);
                setPage(1);
              }}
              placeholder="All batches"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Group
            </label>
            <select
              value={groupId || ""}
              onChange={(e) => {
                setGroupId(e.target.value || null);
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All groups</option>
              {(groups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Call List
            </label>
            <select
              value={callListId || ""}
              onChange={(e) => {
                setCallListId(e.target.value || null);
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All call lists</option>
              {(callListsData?.callLists ?? []).map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={status || ""}
              onChange={(e) => {
                const value = e.target.value;
                const validStatuses: CallLogStatus[] = ["completed", "missed", "busy", "no_answer", "voicemail", "other"];
                setStatus(value && validStatuses.includes(value as CallLogStatus) ? (value as CallLogStatus) : null);
                setPage(1);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              )}
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="busy">Busy</option>
              <option value="no_answer">No Answer</option>
              <option value="voicemail">Voicemail</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              From
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="bg-[var(--groups1-surface)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)] mb-1">
              To
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="bg-[var(--groups1-surface)]"
            />
          </div>

          <div className="flex items-end justify-end md:col-span-4">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CollapsibleFilters>

      {/* Call Logs Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {isLoading ? "Call Logs" : `Call Logs (${filteredLogs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--groups1-text-secondary)]">
              {hasActiveFilters
                ? "No call logs found matching your filters"
                : "No call logs found"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--groups1-border)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Call List
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Duration
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Caller
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const statusColor = getStatusColor(log.status);
                      const statusVariant = statusColor === "green" ? "success" : statusColor === "red" ? "error" : statusColor === "yellow" ? "warning" : "info";
                      return (
                        <tr
                          key={log.id}
                          className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                        >
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {new Date(log.callDate).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {log.student?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {log.callList?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <StatusBadge variant={statusVariant} size="sm">
                              {getStatusLabel(log.status)}
                            </StatusBadge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {formatCallDuration(log.callDuration)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {log.assignee?.user.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  aria-label="Call log actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  className="z-50 min-w-[160px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg"
                                  align="end"
                                >
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)]"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleEditCall(log);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit Call
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)]"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleViewDetails(log.id);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Call
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Showing {((pagination.page - 1) * pagination.size) + 1} to{" "}
                    {Math.min(pagination.page * pagination.size, pagination.total)} of{" "}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-[var(--groups1-text)]">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Call Log Details Modal */}
      <CallLogDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          setIsDetailsModalOpen(open);
          if (!open) {
            setSelectedLogId(null);
          }
        }}
        callLog={selectedLog || null}
      />

      {/* Edit Call Log Dialog */}
      <EditCallLogDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingLog(null);
          }
        }}
        callLog={editingLog}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

export default function CallLogsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Logs</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
          </CardContent>
        </Card>
      </div>
    }>
      <CallLogsPageContent />
    </Suspense>
  );
}

