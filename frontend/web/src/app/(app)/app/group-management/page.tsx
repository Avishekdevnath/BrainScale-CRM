"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useGroupStore } from "@/store/group";
import { useGroups, Group } from "@/hooks/useGroups";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { BatchSelector } from "@/components/batches/BatchSelector";
import { GroupBatchBadge } from "@/components/groups/GroupBatchBadge";
import { GroupBatchDragDrop } from "@/components/groups/GroupBatchDragDrop";

type GroupStatus = "active" | "inactive";

// Helper function to format time ago from ISO timestamp
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

// Helper to convert API Group to UI Group format
function mapGroupToUI(group: Group): {
  id: string;
  name: string;
  status: GroupStatus;
  students: number;
  lastActivity: string;
} {
  return {
    id: group.id,
    name: group.name,
    status: group.isActive ? "active" : "inactive",
    students: group._count.enrollments,
    lastActivity: formatTimeAgo(group.updatedAt),
  };
}

export default function GroupsManagementPage() {
  const router = useRouter();
  const { current: currentGroup, setCurrent } = useGroupStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const { data: groups, error: groupsError, isLoading: groupsLoading, mutate: mutateGroups } = useGroups({
    batchId: selectedBatchId || undefined,
  });
  usePageTitle("Group Management");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: "", status: "active" as GroupStatus, batchId: null as string | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "dragdrop">("table");

  useEffect(() => {
    // Set default group if none selected and groups are loaded
    if (!currentGroup && groups && groups.length > 0) {
      const firstGroup = groups[0];
      setCurrent({ id: firstGroup.id, name: firstGroup.name });
    }
  }, [currentGroup, groups, setCurrent]);

  // Calculate KPIs from groups data
  const uiGroups = groups ? groups.map(mapGroupToUI) : [];
  const totalGroups = uiGroups.length;
  const activeGroups = uiGroups.filter((g) => g.status === "active").length;
  const totalStudents = uiGroups.reduce((sum, g) => sum + g.students, 0);
  const avgPerGroup = totalGroups > 0 ? Math.round(totalStudents / totalGroups) : 0;

  const groupKPIs = [
    {
      label: "Total Groups",
      value: totalGroups.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Active Groups",
      value: activeGroups.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Students",
      value: totalStudents.toLocaleString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Avg. per Group",
      value: avgPerGroup.toString(),
      trend: { value: "", type: "neutral" as const },
    },
  ];

  const handleCreate = () => {
    setEditingGroup(null);
    setFormData({ name: "", status: "active", batchId: null });
    setIsDialogOpen(true);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({ 
      name: group.name, 
      status: group.isActive ? "active" : "inactive",
      batchId: group.batchId || null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (group: Group) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingGroup) {
        // Update existing group
        await apiClient.updateGroup(editingGroup.id, {
          name: formData.name,
          isActive: formData.status === "active",
          batchId: formData.batchId,
        });
        toast.success("Group updated successfully");
      } else {
        // Create new group with batchId if provided
        const newGroup = await apiClient.createGroup({
          name: formData.name,
          isActive: formData.status === "active",
          batchId: formData.batchId || undefined,
        });
        const successMessage = formData.batchId
          ? "Group created and assigned to batch successfully"
          : "Group created successfully";
        toast.success(successMessage);
        // Update group store if this is the first group
        if (!currentGroup && newGroup) {
          setCurrent({ id: newGroup.id, name: newGroup.name });
        }
      }

      // Invalidate and refetch groups
      await mutateGroups();
      await mutate("groups");

      setIsDialogOpen(false);
      setEditingGroup(null);
      setFormData({ name: "", status: "active", batchId: null });
    } catch (error: any) {
      const errorMessage = error?.message || (editingGroup ? "Failed to update group" : "Failed to create group");
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can perform this action");
      } else if (error?.status === 409) {
        toast.error("A group with this name already exists");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteGroup(deletingGroup.id);
      toast.success("Group deleted successfully");

      // If deleted group was current, reset to first available group
      if (currentGroup?.id === deletingGroup.id) {
        const remainingGroups = groups?.filter((g) => g.id !== deletingGroup.id) || [];
        if (remainingGroups.length > 0) {
          const firstGroup = remainingGroups[0];
          setCurrent({ id: firstGroup.id, name: firstGroup.name });
        } else {
          setCurrent(null);
        }
      }

      // Invalidate and refetch groups
      await mutateGroups();
      await mutate("groups");

      setIsDeleteDialogOpen(false);
      setDeletingGroup(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete group";
      
      // Handle specific error codes
      if (error?.status === 403) {
        toast.error("Only admins can delete groups");
      } else if (error?.status === 404) {
        toast.error("Group not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewGroup = (group: Group) => {
    setCurrent({ id: group.id, name: group.name });
    router.push(`/app/groups/${group.id}`);
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

  const handleSelectAll = useCallback(() => {
    if (!groups) return;
    setSelectedGroupIds((prev) => {
      if (prev.size === groups.length) {
        return new Set();
      } else {
        return new Set(groups.map((g) => g.id));
      }
    });
  }, [groups]);

  const handleBulkAssignToBatch = async (batchId: string) => {
    if (selectedGroupIds.size === 0) return;

    setIsBulkAssigning(true);
    try {
      const groupIds = Array.from(selectedGroupIds);
      await Promise.all(
        groupIds.map((groupId) =>
          apiClient.updateGroup(groupId, { batchId })
        )
      );
      
      toast.success(`Successfully assigned ${groupIds.length} group(s) to batch`);
      
      // Clear selection and close dialog
      setSelectedGroupIds(new Set());
      setIsBulkAssignDialogOpen(false);
      
      // Invalidate and refetch groups
      await mutateGroups();
      await mutate("groups");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to assign groups to batch";
      
      if (error?.status === 403) {
        toast.error("Only admins can perform this action");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Loading state
  if (groupsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
              Groups Management
            </h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Manage and monitor all student groups
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (groupsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
              Groups Management
            </h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Manage and monitor all student groups
            </p>
          </div>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-12 text-center">
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {groupsError instanceof Error ? groupsError.message : "Failed to load groups"}
            </p>
            <Button
              onClick={() => mutateGroups()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            Groups Management
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage and monitor all student groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-[var(--groups1-border)] rounded-lg p-1 bg-[var(--groups1-surface)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 px-3",
                viewMode === "table" && "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
              )}
            >
              Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("dragdrop")}
              className={cn(
                "h-8 px-3",
                viewMode === "dragdrop" && "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
              )}
            >
              Drag & Drop
            </Button>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </Button>
        </div>
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

      {/* Drag & Drop View */}
      {viewMode === "dragdrop" && (
        <GroupBatchDragDrop
          onSuccess={async () => {
            await mutateGroups();
            await mutate("groups");
          }}
        />
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <>
      {/* Bulk Actions Toolbar */}
      {selectedGroupIds.size > 0 && (
        <Card variant="groups1" className="border-[var(--groups1-primary)] border-2">
          <CardContent variant="groups1" className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--groups1-text)]">
                  {selectedGroupIds.size} group(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGroupIds(new Set())}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsBulkAssignDialogOpen(true)}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                >
                  Assign to Batch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <div className="flex items-center justify-between">
            <CardTitle>All Groups</CardTitle>
            <div className="flex items-center gap-2">
              <BatchFilter
                value={selectedBatchId}
                onChange={setSelectedBatchId}
                placeholder="All Batches"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent variant="groups1">
          {uiGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
                No groups found. Create your first group to get started.
              </p>
              <Button
                onClick={handleCreate}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)] w-12">
                      <input
                        type="checkbox"
                        checked={groups && groups.length > 0 && selectedGroupIds.size === groups.length}
                        ref={(input) => {
                          if (input && groups) {
                            input.indeterminate =
                              selectedGroupIds.size > 0 && selectedGroupIds.size < groups.length;
                          }
                        }}
                        onChange={handleSelectAll}
                        className="rounded border-[var(--groups1-border)]"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Group Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Batch
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Students
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Last Activity
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--groups1-text)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups?.map((group) => {
                    const uiGroup = mapGroupToUI(group);
                    const isSelected = selectedGroupIds.has(group.id);
                    return (
                      <tr
                        key={group.id}
                        className={cn(
                          "border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors cursor-pointer",
                          isSelected && "bg-[var(--groups1-primary)] bg-opacity-10"
                        )}
                        onClick={() => handleViewGroup(group)}
                      >
                        <td
                          className="py-3 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleGroupSelection(group.id)}
                            className="rounded border-[var(--groups1-border)]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--groups1-text)]">
                            {uiGroup.name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <GroupBatchBadge
                            batchId={group.batchId || null}
                            batchName={group.batch?.name || null}
                            batchIsActive={group.batch?.isActive}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                          {uiGroup.students}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            variant={uiGroup.status === "active" ? "success" : "info"}
                            size="sm"
                          >
                            {uiGroup.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                          {uiGroup.lastActivity}
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEdit(group)}
                              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(group)}
                              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-error)]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[700px]">
          <DialogClose onClose={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Group" : "Create New Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter group name"
                disabled={isSubmitting}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as GroupStatus })
                }
                disabled={isSubmitting}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Batch (Optional)
              </label>
              <BatchSelector
                value={formData.batchId}
                onChange={(value) => setFormData({ ...formData, batchId: value as string | null })}
                placeholder="No Batch"
                allowClear
                isActiveOnly={false}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || isSubmitting}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingGroup ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingGroup ? "Update" : "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={() => setIsDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Are you sure you want to delete <strong>{deletingGroup?.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-[var(--groups1-error)] text-white hover:bg-[var(--groups1-error)]/90"
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
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={() => setIsBulkAssignDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Assign Groups to Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Select a batch to assign {selectedGroupIds.size} selected group(s) to.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--groups1-text)] mb-2">
                Batch
              </label>
              <BatchSelector
                value={null}
                onChange={(value) => {
                  if (typeof value === "string" && value) {
                    handleBulkAssignToBatch(value);
                  }
                }}
                placeholder="Select a batch"
                allowClear={false}
                isActiveOnly={false}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBulkAssignDialogOpen(false)}
                disabled={isBulkAssigning}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
