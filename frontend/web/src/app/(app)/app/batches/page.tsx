"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useBatches } from "@/hooks/useBatches";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { BatchFormDialog } from "@/components/batches/BatchFormDialog";
import { Plus, Pencil, Trash2, Loader2, Eye, Layers } from "lucide-react";
import { ManagementPageHeader } from "@/components/management/ManagementPageHeader";
import { StatusTabBar } from "@/components/management/StatusTabBar";
import { FilterBar } from "@/components/management/FilterBar";
import { FilterChips } from "@/components/management/FilterChips";
import { RowActionsMenu } from "@/components/management/RowActionsMenu";
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
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
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

  const activeFilterCount = [!!searchQuery, statusFilter !== "all"].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const STATUS_TABS = [
    { id: "all", label: "All", count: batches.length },
    { id: "active", label: "Active", count: batches.filter((b) => b.isActive).length },
    { id: "inactive", label: "Inactive", count: batches.filter((b) => !b.isActive).length },
  ];

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
      <ManagementPageHeader
        icon={Layers}
        title="Batch Management"
        subtitle="Manage batches and organize your students"
        onRefresh={() => mutateBatches()}
        actions={
          isAdmin ? (
            <Button
              onClick={handleCreate}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          ) : undefined
        }
      />

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

      <StatusTabBar
        tabs={STATUS_TABS}
        activeId={statusFilter}
        onChange={(id) => setStatusFilter(id as "all" | "active" | "inactive")}
      />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search batches..."
        activeFilterCount={activeFilterCount}
        open={filterPopoverOpen}
        onOpenChange={setFilterPopoverOpen}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] px-3 py-1.5">
          Filters
        </div>
        <div className="px-2 pb-1">
          <div className="text-xs font-medium text-[var(--groups1-text-secondary)] px-1 mb-1">Status</div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setFilterPopoverOpen(false);
            }}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {activeFilterCount > 0 && (
          <div className="border-t border-[var(--groups1-border)] mt-1 pt-1 px-2">
            <button
              onClick={() => { clearAllFilters(); setFilterPopoverOpen(false); }}
              className="w-full text-left text-xs text-red-500 hover:text-red-600 px-1 py-1.5 rounded"
            >
              Clear all filters
            </button>
          </div>
        )}
      </FilterBar>

      <FilterChips
        chips={[
          ...(searchQuery ? [{ key: "search", label: `Search: ${searchQuery}`, onRemove: () => setSearchQuery("") }] : []),
          ...(statusFilter !== "all" ? [{ key: "status", label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter("all") }] : []),
        ]}
        onClearAll={clearAllFilters}
      />

      {/* Batches Table */}
      <div className="bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--groups1-text-secondary)]">
            {searchQuery ? "No batches match your search" : "No batches found"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/40">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Description
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Start Date
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      End Date
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Groups
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Students
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-xs">
                        <Link
                          href={`/app/batches/${batch.id}`}
                          className="font-medium text-[var(--groups1-text)] hover:text-[var(--groups1-primary)]"
                        >
                          {batch.name}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)]">
                        {batch.description || "—"}
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)]">
                        {formatDate(batch.startDate)}
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)]">
                        {formatDate(batch.endDate)}
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--groups1-text)]">
                        {batch._count?.groups || 0}
                      </td>
                      <td className="py-2 px-3 text-xs text-[var(--groups1-text)]">
                        {batch._count?.studentBatches || 0}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <StatusBadge
                          variant={batch.isActive ? "success" : "warning"}
                          size="sm"
                        >
                          {batch.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <RowActionsMenu
                          actions={[
                            {
                              key: "view",
                              label: "View Batch",
                              icon: Eye,
                              onSelect: () => router.push(`/app/batches/${batch.id}`),
                            },
                            ...(isAdmin
                              ? [
                                  {
                                    key: "edit",
                                    label: "Edit Batch",
                                    icon: Pencil,
                                    onSelect: () => handleEdit(batch),
                                  },
                                  {
                                    key: "delete",
                                    label: "Delete Batch",
                                    icon: Trash2,
                                    onSelect: () => handleDelete(batch),
                                    variant: "destructive" as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--groups1-border)]">
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
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
          </>
        )}
      </div>

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

