"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useCallLists } from "@/hooks/useCallLists";
import { useGroup } from "@/hooks/useGroup";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/lib/api-client";
import { GroupCallListCreator } from "@/components/call-lists/GroupCallListCreator";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { CallListDetailsModal } from "@/components/call-lists/CallListDetailsModal";
import { mutate } from "swr";
import { Plus, Pencil, Trash2, Loader2, Search, AlertCircle, Eye } from "lucide-react";
import { FilterToggleButton } from "@/components/common/FilterToggleButton";
import { CollapsibleFilters } from "@/components/common/CollapsibleFilters";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CallList } from "@/types/call-lists.types";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function GroupCallListsPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const groupId = params?.groupId as string;
  const { isLoading: isInitializing } = useGroupInitializer();
  const { data: group, error: groupError, isLoading: groupLoading } = useGroup(groupId);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCallList, setEditingCallList] = useState<CallList | null>(null);
  const [deletingCallList, setDeletingCallList] = useState<CallList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingCallListId, setViewingCallListId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const groupName = group?.name || `Group ${groupId}`;
  usePageTitle(group ? `${groupName} - Call Lists` : "Group Call Lists");

  // Fetch call lists filtered by groupId
  const { data: callListsData, error, isLoading, mutate: mutateCallLists } = useCallLists({
    groupId: groupId,
  });

  const callLists = callListsData?.callLists || [];

  // Filter call lists by search query
  const filteredCallLists = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return callLists;
    const query = debouncedSearchQuery.toLowerCase();
    return callLists.filter((list) => list.name.toLowerCase().includes(query));
  }, [callLists, debouncedSearchQuery]);

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
    await mutate(
      (key) => typeof key === "string" && key.startsWith("call-lists"),
      undefined,
      { revalidate: true }
    );
    
    // Also explicitly mutate the current query to ensure immediate update
    await mutateCallLists();
  };

  const handleViewDetails = (callList: CallList) => {
    setViewingCallListId(callList.id);
  };

  // Loading state
  if (isInitializing || groupLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Call Lists
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {isInitializing ? "Initializing group..." : "Loading call lists..."}
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
    const errorMessage = err instanceof Error ? err.message : "Failed to load call lists";
    const isNotFound = (err as any)?.status === 404;
    const isForbidden = (err as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Call Lists
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Group Not Found" : isForbidden ? "Access Denied" : "Error Loading Call Lists"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this group."
                : errorMessage}
            </p>
            <Button
              onClick={() => mutateCallLists()}
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
            {groupName} - Call Lists
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage call lists for this group
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterToggleButton isOpen={showFilters} onToggle={() => setShowFilters(!showFilters)} />
          <Button
            onClick={handleCreate}
            className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Call List
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <CollapsibleFilters open={showFilters} contentClassName="py-4">
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
      </CollapsibleFilters>

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
              <p className="text-sm text-[var(--groups1-text-secondary)]">No call lists found for this group.</p>
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
                        <Link href={`/app/call-lists/${callList.id}?groupId=${groupId}`} className="hover:underline">
                          {callList.name}
                        </Link>
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

      {/* Group Call List Creator Dialog */}
      {groupId && (
        <GroupCallListCreator
          open={isFormDialogOpen && !editingCallList}
          onOpenChange={(open) => {
            if (!open) {
              setIsFormDialogOpen(false);
              setEditingCallList(null);
            } else {
              setIsFormDialogOpen(open);
            }
          }}
          groupId={groupId}
        />
      )}

      {/* Call List Form Dialog for Editing */}
      {editingCallList && (
        <CallListFormDialog
          open={isFormDialogOpen && !!editingCallList}
          onOpenChange={(open) => {
            if (!open) {
              setIsFormDialogOpen(false);
              setEditingCallList(null);
            } else {
              setIsFormDialogOpen(open);
            }
          }}
          callList={editingCallList}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
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

