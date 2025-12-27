"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBatches } from "@/hooks/useBatches";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { BatchFormDialog } from "@/components/batches/BatchFormDialog";
import { Plus, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Batch } from "@/types/batches.types";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function BatchesPage() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 20;

  usePageTitle("Batch Management");

  const { data: batchesData, error, isLoading, mutate: mutateBatches } = useBatches({
    page: currentPage,
    size: pageSize,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const batches = batchesData?.batches || [];
  const pagination = batchesData?.pagination;

  // Filter batches by search query
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;
    const query = searchQuery.toLowerCase();
    return batches.filter(
      (batch) =>
        batch.name.toLowerCase().includes(query) ||
        batch.description?.toLowerCase().includes(query)
    );
  }, [batches, searchQuery]);

  // Calculate KPIs
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.isActive).length;
  const totalStudents = batches.reduce(
    (sum, b) => sum + (b._count?.studentBatches || 0),
    0
  );

  const batchKPIs = [
    {
      label: "Total Batches",
      value: totalBatches.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Active Batches",
      value: activeBatches.toString(),
      trend: { value: "", type: "neutral" as const },
    },
    {
      label: "Total Students",
      value: totalStudents.toLocaleString(),
      trend: { value: "", type: "neutral" as const },
    },
  ];

  const handleCreate = () => {
    setEditingBatch(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (batch: Batch) => {
    setDeletingBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBatch) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteBatch(deletingBatch.id);
      toast.success("Batch deleted successfully");
      await mutateBatches();
      await mutate("batches");
      setIsDeleteDialogOpen(false);
      setDeletingBatch(null);
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
    await mutateBatches();
    await mutate("batches");
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Batch Management</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage batches and organize your students
          </p>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="pb-6">
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              Error loading batches. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Batch Management</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage batches and organize your students
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
          {isAdmin && (
            <Button
              onClick={handleCreate}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <div className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse">
              <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded mb-3" />
              <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded" />
            </div>
            <div className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse">
              <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded mb-3" />
              <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded" />
            </div>
            <div className="rounded-xl border bg-[var(--groups1-surface)] border-[var(--groups1-card-border)] p-4 shadow-sm animate-pulse">
              <div className="h-3 w-24 bg-[var(--groups1-secondary)] rounded mb-3" />
              <div className="h-8 w-16 bg-[var(--groups1-secondary)] rounded" />
            </div>
          </>
        ) : (
          batchKPIs.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
            />
          ))
        )}
      </div>

      {/* Filters */}
      <CollapsibleFilters open={showFilters} contentClassName="pb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
              <Input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              )}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
      </CollapsibleFilters>

      {/* Batches Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-[var(--groups1-text-secondary)]">
              {searchQuery ? "No batches match your search" : "No batches found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Start Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      End Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Groups
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Students
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/app/batches/${batch.id}`}
                          className="font-medium text-[var(--groups1-text)] hover:text-[var(--groups1-primary)]"
                        >
                          {batch.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                        {batch.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                        {formatDate(batch.startDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text-secondary)]">
                        {formatDate(batch.endDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                        {batch._count?.groups || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--groups1-text)]">
                        {batch._count?.studentBatches || 0}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          variant={batch.isActive ? "success" : "warning"}
                          size="sm"
                        >
                          {batch.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/app/batches/${batch.id}`)}
                            aria-label="View batch"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEdit(batch)}
                                aria-label="Edit batch"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(batch)}
                                aria-label="Delete batch"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--groups1-border)]">
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages || isLoading}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <BatchFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        batch={editingBatch || undefined}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingBatch && (
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
              Are you sure you want to delete "{deletingBatch.name}"? This action cannot be undone.
              {deletingBatch._count?.groups || deletingBatch._count?.studentBatches ? (
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

