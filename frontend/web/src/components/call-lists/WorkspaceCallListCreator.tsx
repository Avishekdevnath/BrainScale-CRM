"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CallListSource } from "@/types/call-lists.types";
import type { StudentsListParams } from "@/types/students.types";

export interface WorkspaceCallListCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilters?: {
    batchId?: string | null;
    groupId?: string | null;
    status?: string | null;
  };
}

export function WorkspaceCallListCreator({
  open,
  onOpenChange,
  initialFilters,
}: WorkspaceCallListCreatorProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<StudentsListParams>({
    batchId: initialFilters?.batchId || undefined,
    groupId: initialFilters?.groupId || undefined,
    status: (initialFilters?.status && ["NEW", "IN_PROGRESS", "FOLLOW_UP", "CONVERTED", "LOST"].includes(initialFilters.status))
      ? (initialFilters.status as StudentsListParams["status"])
      : undefined,
    q: "",
  });
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [listName, setListName] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const debouncedFilters = useDebounce(filters, 500);
  const { data: groups } = useGroups();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    ...debouncedFilters,
    size: 1, // Just to get total count
  });

  // Update preview count when filters change
  useEffect(() => {
    if (open && (debouncedFilters.batchId || debouncedFilters.groupId || debouncedFilters.status || debouncedFilters.q)) {
      setLoadingPreview(true);
      if (studentsData?.pagination) {
        setPreviewCount(studentsData.pagination.total);
        setLoadingPreview(false);
      }
    } else {
      setPreviewCount(null);
    }
  }, [open, debouncedFilters, studentsData]);

  const handleCreate = async () => {
    if (!listName.trim() || listName.trim().length < 2) {
      toast.error("Call list name must be at least 2 characters");
      return;
    }

    // Either targetGroupId must be provided OR we need to have filters that will yield students
    // For now, we'll allow workspace-level call lists (no targetGroupId) if filters are provided
    const hasFilters = !!(filters.batchId || filters.groupId || filters.status || filters.q);

    setCreating(true);
    try {
      // Step 1: Fetch all matching students first (if we have filters)
      let allStudentIds: string[] = [];
      if (hasFilters) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const params: StudentsListParams = {
            ...filters,
            page,
            size: 100, // Max page size
          };
          const response = await apiClient.getStudents(params);
          allStudentIds.push(...response.students.map((s) => s.id));
          hasMore = page < response.pagination.totalPages;
          page++;
        }
      }

      // Step 2: Create call list with studentIds if we have them, otherwise just create empty list
      const callList = await apiClient.createCallList({
        name: listName.trim(),
        source: "FILTER" as CallListSource,
        groupId: targetGroupId || undefined, // Optional - can be null for workspace-level
        studentIds: allStudentIds.length > 0 ? allStudentIds : undefined,
        meta: {
          filters: {
            batchId: filters.batchId,
            groupId: filters.groupId,
            status: filters.status,
            q: filters.q,
          },
          createdFrom: "workspace-dashboard",
          createdAt: new Date().toISOString(),
        },
      });

      if (allStudentIds.length > 0) {
        toast.success(`Call list created with ${allStudentIds.length} students`);
      } else {
        toast.success("Call list created (no students match the filters)");
      }

      onOpenChange(false);
      router.push(`/app/call-lists/${callList.id}`);
    } catch (error: any) {
      console.error("Failed to create call list:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to create call list";
      
      if (error?.status === 403) {
        toast.error("Access denied");
      } else if (error?.status === 404) {
        toast.error("Group not found");
      } else if (error?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Create Call List from Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Filter Students</h3>
            
            <div>
              <Label className="block text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Batch
              </Label>
              <BatchFilter
                value={filters.batchId || null}
                onChange={(batchId) => setFilters({ ...filters, batchId: batchId || undefined })}
                placeholder="All Batches"
              />
            </div>

            <div>
              <Label className="block text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Group (for filtering)
              </Label>
              <select
                value={filters.groupId || ""}
                onChange={(e) => setFilters({ ...filters, groupId: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              >
                <option value="">All Groups</option>
                {groups?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Status
              </Label>
              <select
                value={filters.status || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ 
                    ...filters, 
                    status: value && ["NEW", "IN_PROGRESS", "FOLLOW_UP", "CONVERTED", "LOST"].includes(value)
                      ? (value as StudentsListParams["status"])
                      : undefined
                  });
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
              </select>
            </div>

            <div>
              <Label className="block text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Search
              </Label>
              <Input
                value={filters.q || ""}
                onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })}
                placeholder="Search by name, email, or phone"
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
              />
            </div>

            {loadingPreview || studentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--groups1-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Counting matching students...</span>
              </div>
            ) : previewCount !== null ? (
              <div className="p-3 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
                <p className="text-sm font-medium text-[var(--groups1-text)]">
                  {previewCount} {previewCount === 1 ? "student" : "students"} will be added to the call list
                </p>
              </div>
            ) : null}
          </div>

          {/* Target Group and Name Section */}
          <div className="space-y-3 pt-4 border-t border-[var(--groups1-border)]">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Call List Details</h3>

            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1">
                Target Group <span className="text-gray-400 text-xs">(Optional - leave empty for workspace-level)</span>
              </Label>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
                disabled={creating}
                aria-label="Select target group"
              >
                <option value="">No Group (Workspace-level)</option>
                {groups?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                The group this call list will belong to (optional)
              </p>
            </div>

            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1">
                Call List Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Follow-up Calls - Batch 1"
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
                disabled={creating}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !listName.trim()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Call List"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

