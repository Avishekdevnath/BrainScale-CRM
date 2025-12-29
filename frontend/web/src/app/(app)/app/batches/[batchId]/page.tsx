"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useBatch, useBatchStats } from "@/hooks/useBatches";
import { BatchStatsCard } from "@/components/batches/BatchStatsCard";
import { BatchFormDialog } from "@/components/batches/BatchFormDialog";
import { BatchGroupAlignmentModal } from "@/components/batches/BatchGroupAlignmentModal";
import { useBatchGroups, useRemoveGroupsFromBatch } from "@/hooks/useBatchGroups";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { mutate } from "swr";
import { Loader2, ChevronLeft, Pencil, Trash2, Users, FolderOpen, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { GroupBatchBadge } from "@/components/groups/GroupBatchBadge";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function BatchDetailPage() {
  const isAdmin = useIsAdmin();
  const params = useParams();
  const router = useRouter();
  const batchId = params?.batchId as string;
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlignModalOpen, setIsAlignModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const { data: batch, error, isLoading, mutate: mutateBatch } = useBatch(batchId);
  const { data: stats } = useBatchStats(batchId);
  const { data: groups, isLoading: isLoadingGroups, mutate: mutateGroups } = useBatchGroups(batchId);
  const removeGroups = useRemoveGroupsFromBatch();

  usePageTitle(batch ? `${batch.name} - Batch Details` : "Batch Details");

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const handleEdit = () => {
    if (batch) {
      setIsFormDialogOpen(true);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!batch) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteBatch(batch.id);
      toast.success("Batch deleted successfully");
      router.push("/app/batches");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete batch";
      
      if (error?.status === 403) {
        toast.error("Admin access required");
      } else if (error?.status === 404) {
        toast.error("Batch not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = async () => {
    await mutateBatch();
    await mutate("batches");
  };

  const handleRemoveSelectedGroups = async () => {
    if (selectedGroupIds.size === 0) {
      toast.error("Please select groups to remove");
      return;
    }

    try {
      await removeGroups.mutate(batchId, Array.from(selectedGroupIds));
      toast.success(`${selectedGroupIds.size} group(s) removed from batch`);
      setSelectedGroupIds(new Set());
      await mutateGroups();
    } catch (error: any) {
      console.error("Failed to remove groups:", error);
      const errorMessage = error?.message || "Failed to remove groups";
      
      if (error?.status === 403) {
        toast.error("Only admins can perform this operation");
      } else if (error?.status === 404) {
        toast.error("Batch or group not found");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleToggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!groups) return;
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Batch Details</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Loading batch details...</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Batch Details</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Batch not found</p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="pb-6">
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error ? "Error loading batch" : "Batch not found"}
            </div>
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/app/batches")}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Batches
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/batches")}
            className="mb-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Batches
          </Button>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">{batch.name}</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {batch.description || "No description"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Batch Information */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                Name
              </label>
              <p className="text-sm text-[var(--groups1-text)] mt-1">{batch.name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                Status
              </label>
              <div className="mt-1">
                <StatusBadge
                  variant={batch.isActive ? "success" : "warning"}
                  size="sm"
                >
                  {batch.isActive ? "Active" : "Inactive"}
                </StatusBadge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                Start Date
              </label>
              <p className="text-sm text-[var(--groups1-text)] mt-1">{formatDate(batch.startDate)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                End Date
              </label>
              <p className="text-sm text-[var(--groups1-text)] mt-1">{formatDate(batch.endDate)}</p>
            </div>
            {batch.description && (
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Description
                </label>
                <p className="text-sm text-[var(--groups1-text)] mt-1">{batch.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <BatchStatsCard batchId={batchId} stats={stats || undefined} />

      {/* Groups Section */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>Groups in Batch</CardTitle>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {selectedGroupIds.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveSelectedGroups}
                    className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Selected ({selectedGroupIds.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsAlignModalOpen(true)}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Groups
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isLoadingGroups ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
                No groups in this batch yet.
              </p>
              {isAdmin && (
                <Button
                  onClick={() => setIsAlignModalOpen(true)}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Groups
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isAdmin && groups.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--groups1-border)]">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.size === groups.length && groups.length > 0}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate =
                          selectedGroupIds.size > 0 && selectedGroupIds.size < groups.length;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--groups1-border)]"
                  />
                  <label className="text-sm text-[var(--groups1-text)]">
                    Select All ({groups.length})
                  </label>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--groups1-border)]">
                      {isAdmin && (
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)] w-12">
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.size === groups.length && groups.length > 0}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate =
                                  selectedGroupIds.size > 0 && selectedGroupIds.size < groups.length;
                              }
                            }}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                        Group Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                        Students
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                        Calls
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                        Follow-ups
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const isSelected = selectedGroupIds.has(group.id);
                      return (
                        <tr
                          key={group.id}
                          className={cn(
                            "border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors",
                            isSelected && "bg-[var(--groups1-primary)] bg-opacity-10"
                          )}
                        >
                          {isAdmin && (
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleGroupSelection(group.id)}
                                className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <Link
                              href={`/app/groups/${group.id}`}
                              className="font-medium text-[var(--groups1-text)] hover:text-[var(--groups1-primary)]"
                            >
                              {group.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {group._count.enrollments}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {group._count.calls}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                            {group._count.followups}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge
                              variant={group.isActive ? "success" : "warning"}
                              size="sm"
                            >
                              {group.isActive ? "Active" : "Inactive"}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--groups1-text)]">
                {batch._count?.studentBatches || 0}
              </p>
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                Students in this batch
              </p>
            </div>
            <Link href={`/app/students?batchId=${batchId}`}>
              <Button
                variant="outline"
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
              >
                <Users className="w-4 h-4 mr-2" />
                View Students
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <BatchFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        batch={batch}
        onSuccess={handleFormSuccess}
      />

      {/* Alignment Modal */}
      {batch && (
        <>
          <BatchGroupAlignmentModal
            open={isAlignModalOpen}
            onOpenChange={setIsAlignModalOpen}
            batchId={batchId}
            batchName={batch.name}
            mode="align"
            onSuccess={async () => {
              await mutateGroups();
              await mutateBatch();
            }}
          />
          <BatchGroupAlignmentModal
            open={isRemoveModalOpen}
            onOpenChange={setIsRemoveModalOpen}
            batchId={batchId}
            batchName={batch.name}
            mode="remove"
            onSuccess={async () => {
              await mutateGroups();
              await mutateBatch();
              setSelectedGroupIds(new Set());
            }}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDeleteDialogOpen(false)} />
          <div
            className="relative z-50 w-full max-w-md bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg shadow-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              Delete Batch
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              Are you sure you want to delete "{batch.name}"? This action cannot be undone.
              {batch._count?.groups || batch._count?.studentBatches ? (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  This batch has associated data and will be deactivated instead of deleted.
                </span>
              ) : null}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

