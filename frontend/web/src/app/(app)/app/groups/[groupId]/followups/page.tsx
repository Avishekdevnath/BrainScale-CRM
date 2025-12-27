"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGroupFollowups } from "@/hooks/useGroupFollowups";
import { useGroup } from "@/hooks/useGroup";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FollowupFilters } from "@/components/followups/FollowupFilters";
import { FollowupsTable } from "@/components/followups/FollowupsTable";
import { FollowupCallModal } from "@/components/followups/FollowupCallModal";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import type { ListFollowupsParams } from "@/types/followups.types";

function GroupFollowupsPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = params?.groupId as string;
  const { isLoading: isInitializing } = useGroupInitializer();
  const { data: group, error: groupError, isLoading: groupLoading } = useGroup(groupId);

  const groupName = group?.name || `Group ${groupId}`;
  usePageTitle(group ? `${groupName} - Follow-ups` : "Group Follow-ups");

  const [filters, setFilters] = useState<ListFollowupsParams>({
    page: parseInt(searchParams.get("page") || "1", 10),
    size: parseInt(searchParams.get("size") || "20", 10),
    callListId: searchParams.get("callListId") || undefined,
    status: (() => {
      const statusParam = searchParams.get("status");
      if (!statusParam) return undefined;
      const validStatuses: ("PENDING" | "DONE" | "SKIPPED")[] = ["PENDING", "DONE", "SKIPPED"];
      return validStatuses.includes(statusParam as "PENDING" | "DONE" | "SKIPPED")
        ? (statusParam as "PENDING" | "DONE" | "SKIPPED")
        : undefined;
    })(),
    assignedTo: searchParams.get("assignedTo") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedFollowupId, setSelectedFollowupId] = useState<string | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const { data, isLoading, error, mutate } = useGroupFollowups(groupId, {
    page: filters.page,
    size: filters.size,
    status: filters.status,
    assignedTo: filters.assignedTo,
    startDate: filters.startDate,
    endDate: filters.endDate,
    callListId: filters.callListId,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.page && filters.page > 1) params.set("page", String(filters.page));
    if (filters.size && filters.size !== 20) params.set("size", String(filters.size));
    if (filters.callListId) params.set("callListId", filters.callListId);
    if (filters.status) params.set("status", filters.status);
    if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    const newUrl = params.toString()
      ? `/app/groups/${groupId}/followups?${params.toString()}`
      : `/app/groups/${groupId}/followups`;
    router.replace(newUrl, { scroll: false });
  }, [filters, router, groupId]);

  const handleFiltersChange = (newFilters: ListFollowupsParams) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      size: 20,
    });
  };

  const handleMakeCall = (followupId: string) => {
    setSelectedFollowupId(followupId);
    setIsCallModalOpen(true);
  };

  const handleCallSuccess = () => {
    setIsCallModalOpen(false);
    setSelectedFollowupId(null);
    mutate();
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const followups = data?.followups || [];
  const pagination = data?.pagination;

  // Loading state
  if (isInitializing || groupLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Follow-ups
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {isInitializing ? "Initializing group..." : "Loading follow-ups..."}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (groupError || error) {
    const err = groupError || error;
    const errorMessage = err instanceof Error ? err.message : "Failed to load follow-ups";
    const isNotFound = (err as any)?.status === 404;
    const isForbidden = (err as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Follow-ups
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Group Not Found" : isForbidden ? "Access Denied" : "Error Loading Follow-ups"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this group."
                : errorMessage}
            </p>
            <Button
              onClick={() => mutate()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Follow-ups
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage and track follow-up tasks for this group
          </p>
        </div>
        <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
      </div>

      {/* Filters */}
      {showFilters && (
        <FollowupFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClear={handleClearFilters}
        />
      )}

      {/* Follow-ups Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {isLoading
              ? "Follow-ups"
              : `Follow-ups ${pagination ? `(${pagination.total})` : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : "Failed to load follow-ups"}
              </p>
              <Button
                onClick={() => mutate()}
                className="mt-4 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <FollowupsTable
                followups={followups}
                isLoading={isLoading}
                onMakeCall={handleMakeCall}
              />

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
                  <div className="text-sm text-[var(--groups1-text-secondary)]">
                    Showing {(pagination.page - 1) * pagination.size + 1} to{" "}
                    {Math.min(pagination.page * pagination.size, pagination.total)} of{" "}
                    {pagination.total} follow-ups
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                      className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--groups1-text)]">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages || isLoading}
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

      {/* Follow-up Call Modal */}
      <FollowupCallModal
        open={isCallModalOpen}
        onOpenChange={setIsCallModalOpen}
        followupId={selectedFollowupId}
        onSuccess={handleCallSuccess}
      />
    </div>
  );
}

export default function GroupFollowupsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Follow-ups</h1>
          <Card variant="groups1">
            <CardContent variant="groups1" className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <GroupFollowupsPageContent />
    </Suspense>
  );
}

