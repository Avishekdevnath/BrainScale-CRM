"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { BatchFilter } from "@/components/batches/BatchFilter";
import { useCallLists } from "@/hooks/useCallLists";
import { useGroups } from "@/hooks/useGroups";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/lib/api-client";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { CallListDetailsModal } from "@/components/call-lists/CallListDetailsModal";
import { BulkPasteCallListDialog } from "@/components/call-lists/BulkPasteCallListDialog";
import { mutate } from "swr";
import { Plus, Pencil, Trash2, Loader2, Search, Eye, FileText, CheckCircle2, RotateCcw, Archive, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CallList } from "@/types/call-lists.types";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useFeature } from "@/hooks/usePlatformFeatures";

function CallListsPageContent() {
  const isAdmin = useIsAdmin();
  const groupsFeature = useFeature("groups");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId") || null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'archived'>(
    (searchParams.get("tab") as 'active' | 'completed' | 'archived') || 'active'
  );
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isBulkPasteDialogOpen, setIsBulkPasteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [editingCallList, setEditingCallList] = useState<CallList | null>(null);
  const [deletingCallList, setDeletingCallList] = useState<CallList | null>(null);
  const [completingCallList, setCompletingCallList] = useState<CallList | null>(null);
  const [reopeningCallList, setReopeningCallList] = useState<CallList | null>(null);
  const [archivingCallList, setArchivingCallList] = useState<CallList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [viewingCallListId, setViewingCallListId] = useState<string | null>(null);

  usePageTitle("Call Lists");

  // Fetch counts for all tabs
  const { data: activeData } = useCallLists({
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    status: 'ACTIVE',
  });
  const { data: completedData } = useCallLists({
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    status: 'COMPLETED',
  });
  const { data: archivedData } = useCallLists({
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    status: 'ARCHIVED',
  });

  // Get counts for each tab
  const activeCount = activeData?.callLists?.length || 0;
  const completedCount = completedData?.callLists?.length || 0;
  const archivedCount = archivedData?.callLists?.length || 0;

  // Use the active tab's data for the main table
  const { data: callListsData, error, isLoading, isValidating, mutate: mutateCallLists } = useCallLists({
    batchId: batchId || undefined,
    groupId: groupId || undefined,
    status: activeTab === 'completed' ? 'COMPLETED' : activeTab === 'archived' ? 'ARCHIVED' : 'ACTIVE',
  });

  // Helper to mutate all call list queries
  const mutateAllCallLists = async () => {
    await mutate(
      // SWR keys are namespaced as `${workspaceId}:call-lists...`
      (key) => typeof key === "string" && key.includes(":call-lists"),
      undefined,
      { revalidate: true }
    );
  };

  const { data: groups } = useGroups();

  const callLists = callListsData?.callLists || [];

  // Filter call lists by search query
  const filteredCallLists = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return callLists;
    const query = debouncedSearchQuery.toLowerCase();
    return callLists.filter(
      (list) =>
        list.name.toLowerCase().includes(query) ||
        list.group?.name.toLowerCase().includes(query)
    );
  }, [callLists, debouncedSearchQuery]);

  // Update URL when filters or tab change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
    if (batchId) params.set("batchId", batchId);
    if (groupId) params.set("groupId", groupId);
    if (activeTab !== 'active') params.set("tab", activeTab);
    const newUrl = params.toString() ? `/app/call-lists?${params.toString()}` : "/app/call-lists";
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchQuery, batchId, groupId, activeTab, router]);

  const handleCreate = () => {
    setEditingCallList(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (callList: CallList) => {
    setEditingCallList(callList);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (callList: CallList) => {
    setDeletingCallList(callList);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCallList) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteCallList(deletingCallList.id);
      toast.success("Call list deleted successfully");
      await mutateAllCallLists();
      setIsDeleteDialogOpen(false);
      setDeletingCallList(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete call list";
      if (error?.status === 403) {
        toast.error("Access denied");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = async () => {
    setIsFormDialogOpen(false);
    setEditingCallList(null);
    
    // Invalidate all call list caches to ensure fresh data
    await mutateAllCallLists();
    
    // Clear filters after a short delay to ensure data is loaded first
    // This ensures the new call list is visible regardless of previous filters
    setTimeout(() => {
      setBatchId(null);
      setGroupId(null);
      setSearchQuery("");
    }, 100);
  };

  const handleBulkPasteSuccess = async () => {
    setIsBulkPasteDialogOpen(false);
    
    // Invalidate all call list caches to ensure fresh data
    await mutateAllCallLists();
  };

  const handleRefresh = async () => {
    await mutateAllCallLists();
  };

  const handleViewDetails = (callList: CallList) => {
    setViewingCallListId(callList.id);
  };

  const handleMarkComplete = (callList: CallList) => {
    setCompletingCallList(callList);
    setIsCompleteDialogOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!completingCallList) return;

    setIsCompleting(true);
    try {
      await apiClient.markCallListComplete(completingCallList.id);
      toast.success("Call list marked as complete");
      await mutateAllCallLists();
      setIsCompleteDialogOpen(false);
      setCompletingCallList(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to mark call list as complete";
      if (error?.status === 403) {
        toast.error("Only admins can mark call lists as complete");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReopen = (callList: CallList) => {
    setReopeningCallList(callList);
    setIsReopenDialogOpen(true);
  };

  const handleArchive = (callList: CallList) => {
    setArchivingCallList(callList);
    setIsArchiveDialogOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!archivingCallList) return;

    setIsArchiving(true);
    try {
      await apiClient.updateCallList(archivingCallList.id, { status: 'ARCHIVED' });
      toast.success("Call list archived");
      await mutateAllCallLists();
      setIsArchiveDialogOpen(false);
      setArchivingCallList(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to archive call list";
      if (error?.status === 403) {
        toast.error("Only admins can archive call lists");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async (callList: CallList) => {
    try {
      await apiClient.updateCallList(callList.id, { status: 'ACTIVE' });
      toast.success("Call list unarchived");
      await mutateAllCallLists();
      setActiveTab('active');
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to unarchive call list";
      if (error?.status === 403) {
        toast.error("Only admins can unarchive call lists");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopeningCallList) return;

    setIsReopening(true);
    try {
      await apiClient.markCallListActive(reopeningCallList.id);
      toast.success("Call list reopened");
      await mutateAllCallLists();
      setIsReopenDialogOpen(false);
      setReopeningCallList(null);
      // Switch to active tab after reopening
      setActiveTab('active');
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to reopen call list";
      if (error?.status === 403) {
        toast.error("Only admins can reopen call lists");
      } else if (error?.status === 404) {
        toast.error("Call list not found");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsReopening(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Lists</h1>
        <Card variant="groups1" suppressHydrationWarning>
          <CardContent variant="groups1" className="py-8 text-center" suppressHydrationWarning>
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load call lists"}
            </p>
            <Button
              onClick={() => mutateCallLists()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-4 md:space-y-6 pb-24 md:pb-0 overflow-x-hidden" suppressHydrationWarning>
      {/* Header (Mobile) */}
      <div className="md:hidden px-1 space-y-3" suppressHydrationWarning>
        <div className="flex items-start justify-between gap-3" suppressHydrationWarning>
          <div suppressHydrationWarning>
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <h1 className="text-2xl font-bold text-[var(--groups1-text)] leading-tight">Call Lists</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                disabled={isLoading || isValidating}
                aria-label="Refresh call lists"
              >
                <RefreshCw className={cn("w-4 h-4", (isLoading || isValidating) && "animate-spin")} />
              </Button>
            </div>
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
              Create and manage call lists for outreach.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreate}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
          <Button
            onClick={() => setIsBulkPasteDialogOpen(true)}
            variant="outline"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Bulk Paste
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/app/call-lists/settings")}
              title="Call List Settings"
              className="h-10 w-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Header (Desktop) */}
      <div className="hidden md:flex items-center justify-between" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Lists</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              disabled={isLoading || isValidating}
            >
              <RefreshCw className={cn("w-4 h-4", (isLoading || isValidating) && "animate-spin")} />
            </Button>
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Create and manage call lists for student outreach
          </p>
        </div>
        <div className="flex items-center gap-2" suppressHydrationWarning>
          <Button
            onClick={() => setIsBulkPasteDialogOpen(true)}
            variant="outline"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Bulk Paste
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Call List
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/app/call-lists/settings")}
              title="Call List Settings"
              className="h-10 w-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters + Tabs — single row */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 border-b border-[var(--groups1-border)] pb-2" suppressHydrationWarning>
        <div className="relative min-w-0 w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--groups1-text-secondary)]" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name"
            className={cn("pl-9", "bg-[var(--groups1-surface)]")}
          />
        </div>
        <div className="w-36 shrink-0">
          <BatchFilter value={batchId} onChange={setBatchId} placeholder="All batches" />
        </div>
        {groupsFeature.enabled && (
          <select
            value={groupId || ""}
            onChange={(e) => setGroupId(e.target.value || null)}
            className={cn(
              "w-36 shrink-0 px-3 py-1.5 text-sm rounded-md border border-[var(--groups1-border)]",
              "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
            )}
          >
            <option value="">All groups</option>
            {(groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("active")}
            className={cn(
              "rounded-full",
              activeTab === "active"
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
                : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            Active ({activeCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("completed")}
            className={cn(
              "rounded-full",
              activeTab === "completed"
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
                : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            Completed ({completedCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("archived")}
            className={cn(
              "rounded-full",
              activeTab === "archived"
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
                : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            Archived ({archivedCount})
          </Button>
        </div>
      </div>

      {/* Call Lists Table */}
      <Card variant="groups1" suppressHydrationWarning>
        <CardContent variant="groups1" className="p-0" suppressHydrationWarning>
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading call lists...</p>
            </div>
          ) : filteredCallLists.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No call lists found.</p>
              <Button onClick={handleCreate} variant="link" className="mt-2">
                Create the first call list
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3" suppressHydrationWarning>
                {filteredCallLists.map((callList) => {
                  const detailUrl = `/app/call-lists/${callList.id}`;
                  const subtitle = callList.groupId && groupsFeature.enabled
                    ? `${callList.group?.name || "Group"}${callList.group?.batch?.name ? ` • ${callList.group.batch.name}` : ""}`
                    : "Workspace-wide";
                  const itemsCount = callList._count?.items ?? 0;

                  return (
                    <div
                      key={callList.id}
                      className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={detailUrl} className="text-base font-semibold text-[var(--groups1-text)] hover:underline truncate block">
                              {callList.name}
                            </Link>
                            <div className="mt-1 text-xs text-[var(--groups1-text-secondary)] truncate">
                              {subtitle}
                            </div>
                          </div>
                          <span className="text-[10px] bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] px-2 py-1 rounded-md font-semibold uppercase tracking-wide">
                            {String(callList.source).toLowerCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                              Items
                            </div>
                            <div className="text-[13px] font-semibold text-[var(--groups1-text)]">{itemsCount}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                              Created
                            </div>
                            <div className="text-[13px] font-semibold text-[var(--groups1-text)]">
                              {new Date(callList.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {activeTab === "completed" ? (
                            <div className="space-y-1 col-span-2">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                                Completed
                              </div>
                              <div className="text-[13px] font-semibold text-[var(--groups1-text)]">
                                {callList.completedAt ? new Date(callList.completedAt).toLocaleDateString() : "-"}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="bg-[var(--groups1-background)] border-t border-[var(--groups1-border)] px-4 py-2 flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1 h-9">
                          <Link href={detailUrl}>Open</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-10 p-0"
                          onClick={() => handleViewDetails(callList)}
                          aria-label="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {isAdmin && activeTab === "active" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                              onClick={() => handleMarkComplete(callList)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Complete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9 text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950"
                              onClick={() => handleArchive(callList)}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </Button>
                          </>
                        ) : null}

                        {isAdmin && activeTab === "completed" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950"
                              onClick={() => handleReopen(callList)}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reopen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9 text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950"
                              onClick={() => handleArchive(callList)}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </Button>
                          </>
                        ) : null}

                        {isAdmin && activeTab === "archived" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9 text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950"
                              onClick={() => handleUnarchive(callList)}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Unarchive
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-10 p-0 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDelete(callList)}
                              aria-label="Delete call list"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : null}

                        {isAdmin && activeTab !== "archived" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-10 p-0"
                            onClick={() => handleEdit(callList)}
                            aria-label="Edit call list"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {isAdmin && activeTab !== "archived" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-10 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(callList)}
                            aria-label="Delete call list"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto" suppressHydrationWarning>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/40">
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">#</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Name</th>
                      {groupsFeature.enabled && <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Group</th>}
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Batch</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Source</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Numbers</th>
                      <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Created</th>
                      {activeTab === 'completed' && <th className="text-left py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Completed</th>}
                      <th className="text-right py-2 px-3 text-[10px] font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCallLists.map((callList) => (
                      <tr key={callList.id} className="border-b border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]/50 transition-colors">
                        <td className="py-2 px-3 whitespace-nowrap">
                          {callList.listNumber != null
                            ? <span className="font-mono text-[11px] text-[var(--groups1-text-secondary)]">#{callList.listNumber}</span>
                            : <span className="text-[var(--groups1-text-secondary)]">—</span>}
                        </td>
                        <td className="py-2 px-3 text-xs font-medium text-[var(--groups1-text)] whitespace-nowrap">
                          <Link href={`/app/call-lists/${callList.id}`} className="hover:underline">
                            {callList.name}
                          </Link>
                        </td>
                        {groupsFeature.enabled && (
                          <td className="py-2 px-3 text-xs text-[var(--groups1-text)]">
                            {callList.groupId ? callList.group?.name || "-" : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                Workspace-wide
                              </span>
                            )}
                          </td>
                        )}
                        <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)]">{callList.group?.batch?.name || "—"}</td>
                        <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)]">{callList.source}</td>
                        <td className="py-2 px-3 text-xs text-[var(--groups1-text)]">{callList._count?.items ?? 0}</td>
                        <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)] whitespace-nowrap">{new Date(callList.createdAt).toLocaleDateString()}</td>
                        {activeTab === 'completed' && (
                          <td className="py-2 px-3 text-xs text-[var(--groups1-text-secondary)] whitespace-nowrap">
                            {callList.completedAt ? new Date(callList.completedAt).toLocaleDateString() : '—'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => handleViewDetails(callList)} aria-label="View call list details">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {isAdmin && (
                              <>
                                {activeTab === 'active' && (
                                  <>
                                    <Button variant="ghost" size="icon-sm" onClick={() => handleMarkComplete(callList)} aria-label="Mark complete" className="text-green-600 hover:text-green-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" onClick={() => handleArchive(callList)} aria-label="Archive" className="text-orange-500 hover:text-orange-600">
                                      <Archive className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                                {activeTab === 'completed' && (
                                  <>
                                    <Button variant="ghost" size="icon-sm" onClick={() => handleReopen(callList)} aria-label="Reopen" className="text-blue-600 hover:text-blue-700">
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon-sm" onClick={() => handleArchive(callList)} aria-label="Archive" className="text-orange-500 hover:text-orange-600">
                                      <Archive className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                                {activeTab === 'archived' && (
                                  <Button variant="ghost" size="icon-sm" onClick={() => handleUnarchive(callList)} aria-label="Unarchive" className="text-purple-600 hover:text-purple-700">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(callList)} aria-label="Edit call list">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(callList)} aria-label="Delete call list">
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
            </>
          )}
        </CardContent>
      </Card>

      <CallListFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        callList={editingCallList || undefined}
        onSuccess={handleFormSuccess}
      />

      <BulkPasteCallListDialog
        open={isBulkPasteDialogOpen}
        onOpenChange={setIsBulkPasteDialogOpen}
        onSuccess={handleBulkPasteSuccess}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delete Call List</DialogTitle>
            <DialogClose onClose={() => setIsDeleteDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to delete the call list "{deletingCallList?.name}"? This action cannot be undone and will delete all associated items.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Mark Call List as Complete</DialogTitle>
            <DialogClose onClose={() => setIsCompleteDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to mark "{completingCallList?.name}" as complete? This action can be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCompleteDialogOpen(false)}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={isCompleting}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isCompleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Mark as Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reopen Call List</DialogTitle>
            <DialogClose onClose={() => setIsReopenDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to reopen "{reopeningCallList?.name}"? It will be moved back to active call lists.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsReopenDialogOpen(false)}
              disabled={isReopening}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReopen}
              disabled={isReopening}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isReopening ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Reopen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Archive Call List</DialogTitle>
            <DialogClose onClose={() => setIsArchiveDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to archive "{archivingCallList?.name}"? It will be moved to archived call lists and can be unarchived later.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmArchive}
              disabled={isArchiving}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isArchiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call List Details Modal */}
      <CallListDetailsModal
        open={!!viewingCallListId}
        onOpenChange={(open) => {
          if (!open) setViewingCallListId(null);
        }}
        callListId={viewingCallListId}
      />
    </div>
  );
}

export default function CallListsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Lists</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
          </CardContent>
        </Card>
      </div>
    }>
      <CallListsPageContent />
    </Suspense>
  );
}
