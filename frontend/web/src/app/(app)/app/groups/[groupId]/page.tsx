"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGroupStore } from "@/store/group";
import { useGroup } from "@/hooks/useGroup";
import { useGroupCalls } from "@/hooks/useGroupCalls";
import { useGroupFollowups } from "@/hooks/useGroupFollowups";
import { useBatches } from "@/hooks/useBatches";
import { BatchSelector } from "@/components/batches/BatchSelector";
import { GroupBatchBadge } from "@/components/groups/GroupBatchBadge";
import { apiClient } from "@/lib/api-client";
import { mutate } from "swr";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, Pencil, Save, X, Phone } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { GroupCallListCreator } from "@/components/call-lists/GroupCallListCreator";
import { usePageTitle } from "@/hooks/usePageTitle";
import Link from "next/link";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";

// TODO: Replace with actual role check from auth/store
const isAdmin = true;

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.groupId as string;
  const { current: currentGroup, setCurrent } = useGroupStore();
  const { data: group, error: groupError, isLoading: groupLoading, mutate: mutateGroup } = useGroup(groupId);
  const { isLoading: isInitializing } = useGroupInitializer();
  usePageTitle(group ? `${group.name} - Group Details` : "Group Details");
  
  const [callsPage, setCallsPage] = useState(1);
  const [followupsPage, setFollowupsPage] = useState(1);
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isCallListCreatorOpen, setIsCallListCreatorOpen] = useState(false);
  const pageSize = 5;

  const { data: callsData, isLoading: callsLoading } = useGroupCalls(groupId, {
    page: callsPage,
    size: pageSize,
  });

  const { data: followupsData, isLoading: followupsLoading } = useGroupFollowups(groupId, {
    page: followupsPage,
    size: pageSize,
  });

  useEffect(() => {
    // Update group store when group data loads
    if (group && currentGroup?.id !== group.id) {
      setCurrent({ id: group.id, name: group.name });
    }
    // Sync selectedBatchId with group's batchId
    if (group) {
      setSelectedBatchId(group.batchId || null);
    }
  }, [group, currentGroup, setCurrent]);

  const handleSaveBatch = async () => {
    if (!group) return;
    setIsSavingBatch(true);
    try {
      await apiClient.updateGroup(groupId, {
        batchId: selectedBatchId || null,
      });
      toast.success("Batch association updated");
      await mutateGroup();
      await mutate("groups");
      setIsEditingBatch(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update batch association";
      
      if (error?.status === 403) {
        toast.error("Admin access required");
      } else if (error?.status === 404) {
        toast.error("Group or batch not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleCancelBatchEdit = () => {
    if (group) {
      setSelectedBatchId(group.batchId || null);
    }
    setIsEditingBatch(false);
  };

  // Calculate KPIs from group data
  const groupKPIs = group
    ? [
        {
          label: "Total Students",
          value: group._count.enrollments.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Total Calls",
          value: group._count.calls.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Follow-ups",
          value: group._count.followups.toString(),
          trend: { value: "", type: "neutral" as const },
        },
        {
          label: "Call Lists",
          value: (group._count.callLists || 0).toString(),
          trend: { value: "", type: "neutral" as const },
        },
      ]
    : [];

  const groupName = group?.name || currentGroup?.name || `Group ${groupId}`;

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (isInitializing || groupLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName}
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {isInitializing ? "Initializing group..." : "Loading group details..."}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (groupError) {
    const errorMessage =
      groupError instanceof Error ? groupError.message : "Failed to load group";
    const isNotFound = (groupError as any)?.status === 404;
    const isForbidden = (groupError as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Group Details
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Group Not Found" : isForbidden ? "Access Denied" : "Error Loading Group"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this group."
                : errorMessage}
            </p>
            <Button
              onClick={() => router.push("/app/group-management")}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Back to Groups
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
          {groupName}
        </h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Detailed view and management for this group
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groupKPIs.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Batch Association */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>Batch Association</CardTitle>
            {isAdmin && !isEditingBatch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingBatch(true)}
                className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isEditingBatch ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                  Select Batch
                </label>
                <BatchSelector
                  value={selectedBatchId}
                  onChange={(value) => setSelectedBatchId(typeof value === "string" ? value : value?.[0] || null)}
                  multiple={false}
                  placeholder="No batch"
                  allowClear={true}
                  isActiveOnly={true}
                />
                <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Select a batch to associate this group with, or leave empty to remove association.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveBatch}
                  disabled={isSavingBatch}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  {isSavingBatch ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelBatchEdit}
                  disabled={isSavingBatch}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <GroupBatchBadge
                batchId={group.batchId || null}
                batchName={group.batch?.name || null}
                batchIsActive={group.batch?.isActive}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Details */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Calls */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            {callsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
              </div>
            ) : callsData && callsData.calls.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {callsData.calls.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--groups1-text)]">
                            {call.student.name}
                          </p>
                          <p className="text-xs text-[var(--groups1-text-secondary)]">
                            {formatDate(call.callDate)}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">
                          {call.callStatus}
                        </span>
                      </div>
                      {call.notes && (
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-2">
                          {call.notes}
                        </p>
                      )}
                      <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                        By {call.creator.name}
                      </p>
                    </div>
                  ))}
                </div>
                {callsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--groups1-border)]">
                    <p className="text-xs text-[var(--groups1-text-secondary)]">
                      Page {callsData.pagination.page} of {callsData.pagination.totalPages} (
                      {callsData.pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCallsPage((p) => Math.max(1, p - 1))}
                        disabled={callsPage === 1}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCallsPage((p) =>
                            Math.min(callsData.pagination.totalPages, p + 1)
                          )
                        }
                        disabled={callsPage >= callsData.pagination.totalPages}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                No calls found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Follow-ups */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Recent Follow-ups</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            {followupsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
              </div>
            ) : followupsData && followupsData.followups.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {followupsData.followups.map((followup) => (
                    <div
                      key={followup.id}
                      className="p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--groups1-text)]">
                            {followup.student.name}
                          </p>
                          <p className="text-xs text-[var(--groups1-text-secondary)]">
                            Due: {formatDate(followup.dueAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              followup.isOverdue
                                ? "bg-[var(--groups1-error)]/20 text-[var(--groups1-error)]"
                                : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                            }`}
                          >
                            {followup.status}
                          </span>
                          {followup.isOverdue && (
                            <span className="text-xs text-[var(--groups1-error)]">Overdue</span>
                          )}
                        </div>
                      </div>
                      {followup.notes && (
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-2">
                          {followup.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-[var(--groups1-text-secondary)]">
                          By {followup.creator.name}
                        </p>
                        {followup.assignee && (
                          <p className="text-xs text-[var(--groups1-text-secondary)]">
                            Assigned to {followup.assignee.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {followupsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--groups1-border)]">
                    <p className="text-xs text-[var(--groups1-text-secondary)]">
                      Page {followupsData.pagination.page} of{" "}
                      {followupsData.pagination.totalPages} ({followupsData.pagination.total}{" "}
                      total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFollowupsPage((p) => Math.max(1, p - 1))}
                        disabled={followupsPage === 1}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFollowupsPage((p) =>
                            Math.min(followupsData.pagination.totalPages, p + 1)
                          )
                        }
                        disabled={followupsPage >= followupsData.pagination.totalPages}
                        className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
                No follow-ups found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GroupCallListCreator
        open={isCallListCreatorOpen}
        onOpenChange={setIsCallListCreatorOpen}
        groupId={groupId}
      />
    </div>
  );
}
