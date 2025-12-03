"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroups } from "@/hooks/useGroups";
import { useStudents } from "@/hooks/useStudents";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CallListSource } from "@/types/call-lists.types";
import type { StudentsListParams } from "@/types/students.types";

export interface GroupCallListCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  initialFilters?: {
    status?: string | null;
    courseId?: string | null;
    moduleId?: string | null;
  };
}

export function GroupCallListCreator({
  open,
  onOpenChange,
  groupId,
  initialFilters,
}: GroupCallListCreatorProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<StudentsListParams>({
    groupId,
    status: initialFilters?.status || undefined,
    courseId: initialFilters?.courseId || undefined,
    moduleId: initialFilters?.moduleId || undefined,
    q: "",
  });
  const [listName, setListName] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const debouncedFilters = useDebounce(filters, 500);
  const { data: groups } = useGroups();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    ...debouncedFilters,
    size: 1, // Just to get total count
  });

  const currentGroup = groups?.find((g) => g.id === groupId);

  // Update preview count when filters change
  useEffect(() => {
    if (open && (debouncedFilters.status || debouncedFilters.courseId || debouncedFilters.moduleId || debouncedFilters.q)) {
      setLoadingPreview(true);
      if (studentsData?.pagination) {
        setPreviewCount(studentsData.pagination.total);
        setLoadingPreview(false);
      }
    } else if (open) {
      // If no filters, show all students in group
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

    setCreating(true);
    try {
      // Step 1: Create call list
      const callList = await apiClient.createCallList({
        groupId,
        name: listName.trim(),
        source: "FILTER" as CallListSource,
        meta: {
          filters: {
            groupId,
            status: filters.status,
            courseId: filters.courseId,
            moduleId: filters.moduleId,
            q: filters.q,
          },
          createdFrom: "group-dashboard",
          createdAt: new Date().toISOString(),
        },
      });

      // Step 2: Fetch all matching students and add them
      let allStudentIds: string[] = [];
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

      // Step 3: Add students in batches
      if (allStudentIds.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < allStudentIds.length; i += batchSize) {
          const batch = allStudentIds.slice(i, i + batchSize);
          await apiClient.addCallListItems(callList.id, { studentIds: batch });
        }
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Create Call List from Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group Display */}
          <div className="p-3 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
            <Label className="block text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
              Group
            </Label>
            <p className="text-sm font-medium text-[var(--groups1-text)]">
              {currentGroup?.name || "Loading..."}
            </p>
          </div>

          {/* Filters Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Filter Students</h3>
            
            <div>
              <Label className="block text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Status
              </Label>
              <select
                value={filters.status || ""}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
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

          {/* Call List Name Section */}
          <div className="space-y-3 pt-4 border-t border-[var(--groups1-border)]">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)]">Call List Details</h3>

            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1">
                Call List Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., New Leads - This Week"
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

