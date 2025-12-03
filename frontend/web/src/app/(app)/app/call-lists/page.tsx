"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { mutate } from "swr";
import { Plus, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CallList } from "@/types/call-lists.types";

// TODO: Replace with actual role check from auth/store
const isAdmin = true;

function CallListsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [batchId, setBatchId] = useState<string | null>(searchParams.get("batchId") || null);
  const [groupId, setGroupId] = useState<string | null>(searchParams.get("groupId") || null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCallList, setEditingCallList] = useState<CallList | null>(null);
  const [deletingCallList, setDeletingCallList] = useState<CallList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingCallListId, setViewingCallListId] = useState<string | null>(null);

  usePageTitle("Call Lists");

  const { data: callListsData, error, isLoading, mutate: mutateCallLists } = useCallLists({
    batchId: batchId || undefined,
    groupId: groupId || undefined,
  });

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

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
    if (batchId) params.set("batchId", batchId);
    if (groupId) params.set("groupId", groupId);
    const newUrl = params.toString() ? `/app/call-lists?${params.toString()}` : "/app/call-lists";
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchQuery, batchId, groupId, router]);

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
      await mutateCallLists();
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
    // This will revalidate all SWR keys that start with "call-lists"
    await mutate(
      (key) => typeof key === "string" && key.startsWith("call-lists"),
      undefined,
      { revalidate: true }
    );
    
    // Also explicitly mutate the current query to ensure immediate update
    await mutateCallLists();
    
    // Clear filters after a short delay to ensure data is loaded first
    // This ensures the new call list is visible regardless of previous filters
    setTimeout(() => {
      setBatchId(null);
      setGroupId(null);
      setSearchQuery("");
    }, 100);
  };

  const handleViewDetails = (callList: CallList) => {
    setViewingCallListId(callList.id);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call Lists</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load call lists"}
            </p>
            <Button
              onClick={() => mutateCallLists()}
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
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Call Lists</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Create and manage call lists for student outreach
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Call List
        </Button>
      </div>

      {/* Filters */}
      <Card variant="groups1">
        <CardContent variant="groups1" className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
                <Input
                  type="text"
                  placeholder="Search call lists by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Batch
              </label>
              <BatchFilter
                value={batchId}
                onChange={setBatchId}
                placeholder="All Batches"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                Group
              </label>
              <select
                value={groupId || ""}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
              >
                <option value="">All Groups</option>
                {groups?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Lists Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {isLoading ? "Call Lists" : `Call Lists (${filteredCallLists.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading call lists...</p>
            </div>
          ) : filteredCallLists.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No call lists found.</p>
              <Button onClick={handleCreate} variant="link" className="mt-2">
                Create the first call list
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--groups1-card-border-inner)]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Batch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCallLists.map((callList) => (
                    <tr key={callList.id} className="hover:bg-[var(--groups1-secondary)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--groups1-text)] whitespace-nowrap">
                        <Link href={`/app/call-lists/${callList.id}`} className="hover:underline">
                          {callList.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                        {callList.groupId ? (
                          callList.group?.name || "-"
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                            Workspace-wide
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)]">
                        {callList.group?.batch?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)]">
                        {callList.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                        {callList._count?.items ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)] whitespace-nowrap">
                        {new Date(callList.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleViewDetails(callList)}
                          aria-label="View call list details"
                          className="mr-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEdit(callList)}
                              aria-label="Edit call list"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(callList)}
                              aria-label="Delete call list"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CallListFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        callList={editingCallList || undefined}
        onSuccess={handleFormSuccess}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
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
