"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useMyCalls, useMyCallsStats } from "@/hooks/useMyCalls";
import { useGroups } from "@/hooks/useGroups";
import { useCallLists } from "@/hooks/useCallLists";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { CallExecutionModal } from "@/components/call-lists/CallExecutionModal";
import { getStateLabel, getStateColor, formatCallDuration } from "@/lib/call-list-utils";
import { mutate } from "swr";
import { Phone, Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallListItem, CallListItemState } from "@/types/call-lists.types";

function MyCallsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId") || null);
  const [callListId, setCallListId] = useState<string | null>(searchParams.get("callListId") || null);
  const [state, setState] = useState<CallListItemState | null>(() => {
    const stateParam = searchParams.get("state");
    if (!stateParam) return null;
    const validStates: CallListItemState[] = ["QUEUED", "CALLING", "DONE", "SKIPPED"];
    return validStates.includes(stateParam as CallListItemState) ? (stateParam as CallListItemState) : null;
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedItem, setSelectedItem] = useState<CallListItem | null>(null);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);

  usePageTitle("My Calls");

  const { data: callsData, error, isLoading, mutate: mutateCalls } = useMyCalls({
    page,
    size: 20,
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    callListId: callListId || undefined,
    state: state || undefined,
  });

  const { data: stats, mutate: mutateStats } = useMyCallsStats();
  const { data: groups } = useGroups();
  const { data: callListsData } = useCallLists();

  const items = callsData?.items || [];
  const pagination = callsData?.pagination || { page: 1, size: 20, total: 0, totalPages: 0 };

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.student?.name.toLowerCase().includes(query) ||
        item.student?.email?.toLowerCase().includes(query) ||
        item.callList?.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (batchId) params.set("batchId", batchId);
    if (groupId) params.set("groupId", groupId);
    if (callListId) params.set("callListId", callListId);
    if (state) params.set("state", state);
    if (searchQuery) params.set("q", searchQuery);
    const newUrl = params.toString() ? `/app/my-calls?${params.toString()}` : "/app/my-calls";
    router.replace(newUrl, { scroll: false });
  }, [page, batchId, groupId, callListId, state, searchQuery, router]);

  const handleStartCall = (item: CallListItem) => {
    setSelectedItem(item);
    setIsExecutionModalOpen(true);
  };

  const handleExecutionSuccess = async () => {
    setIsExecutionModalOpen(false);
    setSelectedItem(null);
    await mutateCalls();
    await mutateStats();
    toast.success("Call completed successfully");
  };

  const clearFilters = () => {
    setBatchId(null);
    setGroupId(null);
    setCallListId(null);
    setState(null);
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = batchId || groupId || callListId || state || searchQuery;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load calls"}
            </p>
            <Button
              onClick={() => mutateCalls()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            label="Total Assigned"
            value={stats.totalAssigned}
          />
          <KPICard
            label="Completed"
            value={stats.completed}
            trend={{
              value: stats.totalAssigned > 0
                ? `${Math.round((stats.completed / stats.totalAssigned) * 100)}%`
                : "0%",
              type: "positive",
            }}
          />
          <KPICard
            label="Pending"
            value={stats.pending}
          />
          <KPICard
            label="This Week"
            value={stats.totalAssigned}
          />
        </div>
      )}

      {/* Filters */}
      <Card variant="groups1">
        <CardContent variant="groups1" className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or call list..."
                className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              />
            </div>

            <BatchFilter
              value={batchId}
              onChange={(value) => {
                setBatchId(value);
                setPage(1);
              }}
              placeholder="All Batches"
            />

            <select
              value={groupId || ""}
              onChange={(e) => {
                setGroupId(e.target.value || null);
                setPage(1);
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Groups</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={callListId || ""}
              onChange={(e) => {
                setCallListId(e.target.value || null);
                setPage(1);
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Call Lists</option>
              {callListsData?.callLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            <select
              value={state || ""}
              onChange={(e) => {
                const value = e.target.value;
                const validStates: CallListItemState[] = ["QUEUED", "CALLING", "DONE", "SKIPPED"];
                setState(value && validStates.includes(value as CallListItemState) ? (value as CallListItemState) : null);
                setPage(1);
              }}
              className="min-w-[180px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
            >
              <option value="">All Statuses</option>
              <option value="QUEUED">Pending</option>
              <option value="CALLING">In Progress</option>
              <option value="DONE">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>

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
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Assigned Calls</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {hasActiveFilters
                ? "No calls found matching your filters"
                : "No calls assigned to you"}
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
                      const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
                        >
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.student?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {primaryPhone ? (
                              <a
                                href={`tel:${primaryPhone.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {primaryPhone.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.callList?.name || "Unknown"}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                            {item.callList?.group?.name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <StatusBadge
                              variant={getStateColor(item.state) === "green" ? "success" : getStateColor(item.state) === "yellow" ? "warning" : getStateColor(item.state) === "blue" ? "info" : "info"}
                            >
                              {getStateLabel(item.state)}
                            </StatusBadge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.state === "DONE" ? (
                              <span className="text-sm text-gray-400">Completed</span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartCall(item)}
                                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Start Call
                              </Button>
                            )}
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
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
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
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
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

      {/* Call Execution Modal */}
      <CallExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={setIsExecutionModalOpen}
        callListItem={selectedItem}
        onSuccess={handleExecutionSuccess}
      />
    </div>
  );
}

export default function MyCallsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">My Calls</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
          </CardContent>
        </Card>
      </div>
    }>
      <MyCallsPageContent />
    </Suspense>
  );
}

