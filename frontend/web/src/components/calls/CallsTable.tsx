"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallExecutionModal } from "@/components/call-lists/CallExecutionModal";
import { PhoneHistoryDrawer } from "@/components/calls/PhoneHistoryDrawer";
import { useAllCalls } from "@/hooks/useMyCalls";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import type { CallListItem, CallListItemState, GetMyCallsParams } from "@/types/call-lists.types";

export interface CallsTableProps {
  callListId?: string | null;
  searchQuery?: string;
  state?: CallListItemState | null;
  followUpRequired?: boolean;
  assignedTo?: string | null;
  onItemsUpdated?: () => void;
}

export function CallsTable({ callListId, searchQuery = "", state = null, followUpRequired, assignedTo, onItemsUpdated }: CallsTableProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = React.useState(false);
  const [historyPhone, setHistoryPhone] = React.useState<{ phone: string; name?: string | null } | null>(null);
  const [pageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState<number>(1);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Build filters — all server-side
  const filters: GetMyCallsParams = React.useMemo(() => {
    return {
      page,
      size: pageSize,
      callListId: callListId || undefined,
      q: searchQuery.trim() || undefined,
      state: followUpRequired ? undefined : (state || undefined),
      followUpRequired: followUpRequired ? true : undefined,
      assignedTo: assignedTo || undefined,
    };
  }, [page, pageSize, callListId, searchQuery, state, followUpRequired, assignedTo]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [callListId, searchQuery, state, followUpRequired, assignedTo]);

  const { data, isLoading, error, mutate } = useAllCalls(filters);

  const items = data?.items || [];
  const pagination = data?.pagination;
  const filteredItems = items;

  const totalItems = pagination?.total ?? filteredItems.length;
  const totalPages = pagination?.totalPages ?? Math.ceil(totalItems / pageSize);

  // Check if there are active filters
  const hasActiveFilters = Boolean(callListId || searchQuery.trim() || followUpRequired);

  const handleStartCall = (item: CallListItem) => {
    setSelectedItem(item);
    setIsExecutionModalOpen(true);
  };

  const handleExecutionSuccess = async () => {
    setIsExecutionModalOpen(false);
    setSelectedItem(null);
    await mutate();
    onItemsUpdated?.();
  };

  const getStateVariant = (state: CallListItemState): "success" | "warning" | "info" | "error" => {
    const color = getStateColor(state);
    switch (color) {
      case "green":
        return "success";
      case "blue":
        return "info";
      case "red":
        return "error";
      case "yellow":
      case "gray":
      default:
        return "warning";
    }
  };

  return (
    <>
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>
              {followUpRequired ? "Calls Requiring Follow-up" : state === "DONE" ? "Calls Completed" : state === "QUEUED" ? "Calls Pending" : "All Calls"} ({totalItems})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {!mounted ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load calls"}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--groups1-text-secondary)]">
              {hasActiveFilters
                ? "No calls found matching your filters"
                : followUpRequired
                  ? "No calls requiring follow-up"
                  : state === "DONE" 
                    ? "No completed calls"
                    : state === "QUEUED"
                      ? "No pending calls"
                      : "No calls"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--groups1-border)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Call List
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Group
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Caller
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-[var(--groups1-text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const student = item.student;
                      const callList = item.callList;
                      const primaryPhone = student?.phones?.find((p) => p.isPrimary) || student?.phones?.[0];

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                        >
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {student?.id ? (
                              <button
                                onClick={() => router.push(`/app/students/${student.id}`)}
                                className="text-[var(--groups1-primary)] hover:underline font-medium"
                              >
                                {student.name || "Unknown"}
                              </button>
                            ) : (
                              <span>{student?.name || "Unknown"}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {primaryPhone ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${primaryPhone.phone}`}
                                  className="text-[var(--groups1-primary)] hover:underline"
                                >
                                  {primaryPhone.phone}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setHistoryPhone({ phone: primaryPhone.phone, name: student?.name })}
                                  className="text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] underline-offset-2 hover:underline"
                                  title="Call history for this number"
                                >
                                  history
                                </button>
                              </div>
                            ) : (
                              <span className="text-[var(--groups1-text-secondary)]">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {callList?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {callList?.group?.name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.assignee
                              ? item.assignee.user.name?.trim() || item.assignee.user.email
                              : <span className="text-[var(--groups1-text-secondary)]">—</span>}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <StatusBadge variant={getStateVariant(item.state)}>
                              {getStateLabel(item.state)}
                            </StatusBadge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartCall(item)}
                              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Call
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Showing {filteredItems.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(page * pageSize, totalItems)} of {totalItems} items
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="text-sm text-[var(--groups1-text-secondary)]">
                        Page {page} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                        className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CallExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={setIsExecutionModalOpen}
        callListItem={selectedItem}
        onSuccess={handleExecutionSuccess}
      />

      <PhoneHistoryDrawer
        open={historyPhone !== null}
        onOpenChange={(open) => { if (!open) setHistoryPhone(null); }}
        phone={historyPhone?.phone ?? null}
        studentName={historyPhone?.name ?? null}
      />
    </>
  );
}

