"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CallExecutionModal } from "@/components/call-lists/CallExecutionModal";
import { useMyCalls } from "@/hooks/useMyCalls";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CallListItem, CallListItemState, GetMyCallsParams } from "@/types/call-lists.types";

export interface CallsTableProps {
  callListId?: string | null;
  searchQuery?: string;
  onItemsUpdated?: () => void;
}

export function CallsTable({ callListId, searchQuery = "", onItemsUpdated }: CallsTableProps) {
  const [selectedItem, setSelectedItem] = React.useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = React.useState(false);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [page, setPage] = React.useState<number>(1);

  // Build filters - default to showing QUEUED and CALLING (pending calls)
  const filters: GetMyCallsParams = React.useMemo(() => {
    const params: GetMyCallsParams = {
      page,
      size: pageSize,
      callListId: callListId || undefined,
      // Default to QUEUED state (pending calls)
      state: "QUEUED",
    };
    return params;
  }, [page, pageSize, callListId]);

  const { data, isLoading, error, mutate } = useMyCalls(filters);

  const items = data?.items || [];
  const pagination = data?.pagination;

  // Client-side search filtering
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const student = item.student;
      if (!student) return false;

      const nameMatch = student.name?.toLowerCase().includes(query);
      const emailMatch = student.email?.toLowerCase().includes(query);
      const phoneMatch = student.phones?.some((p) => p.phone?.toLowerCase().includes(query));

      return nameMatch || emailMatch || phoneMatch;
    });
  }, [items, searchQuery]);

  const totalItems = pagination?.total || filteredItems.length;
  const totalPages = pagination?.totalPages || Math.ceil(filteredItems.length / pageSize);

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
              Calls Pending ({totalItems})
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--groups1-text-secondary)]">Per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  className="px-2 py-1 text-sm rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading calls...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load calls"}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No pending calls found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Call List
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const student = item.student;
                      const callList = item.callList;
                      const assignee = item.assignee;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            index % 2 === 0
                              ? "bg-[var(--groups1-background)]"
                              : "bg-[var(--groups1-surface)]"
                          } hover:bg-[var(--groups1-secondary)]`}
                        >
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                            {student?.email ? (
                              <a
                                href={`mailto:${student.email}`}
                                className="text-sm text-[var(--groups1-text)] hover:underline"
                              >
                                {student.email}
                              </a>
                            ) : (
                              <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                            {student ? (
                              <Link
                                href={`/app/students/${student.id}`}
                                className="font-medium text-[var(--groups1-text)] hover:underline"
                              >
                                {student.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-[var(--groups1-text-secondary)]">
                                Student not found
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                            {callList ? (
                              <Link
                                href={`/app/call-lists/${callList.id}`}
                                className="text-sm text-[var(--groups1-text)] hover:underline"
                              >
                                {callList.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                            {assignee?.user ? (
                              <span className="text-sm text-[var(--groups1-text)]">
                                {assignee.user.name || assignee.user.email}
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--groups1-text-secondary)]">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)]">
                            <StatusBadge variant={getStateVariant(item.state)} size="sm">
                              {getStateLabel(item.state)}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3 border-b border-[var(--groups1-card-border-inner)] text-right">
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Showing {filteredItems.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                    {Math.min(page * pageSize, totalItems)} of {totalItems} items
                  </div>
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
    </>
  );
}

