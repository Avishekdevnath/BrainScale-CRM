"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useCallList, useCallListItems } from "@/hooks/useCallLists";
import { CollapsibleStatsCard } from "@/components/call-lists/CollapsibleStatsCard";
import { CallListItemsTable } from "@/components/call-lists/CallListItemsTable";
import { CallListBulkActionsToolbar } from "@/components/call-lists/CallListBulkActionsToolbar";
import { CallListActionsMenu } from "@/components/call-lists/CallListActionsMenu";
import { CollapsibleFilterCriteria } from "@/components/call-lists/CollapsibleFilterCriteria";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { AddStudentsDialog } from "@/components/call-lists/AddStudentsDialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBatch } from "@/hooks/useBatches";
import { apiClient } from "@/lib/api-client";
import { extractQuestions } from "@/lib/call-list-utils";
import { Loader2, ArrowLeft, Info, MessageSquare, HelpCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useFeature } from "@/hooks/usePlatformFeatures";

function CallListDetailPageContent() {
  const groupsFeature = useFeature("groups");
  // OWNER/ADMIN bypass inside useHasPermission; members gated by DB permissions
  const canEditList = useHasPermission("call_lists", "update");
  const canDeleteList = useHasPermission("call_lists", "delete");
  const canManageItems = canEditList; // managing list items requires update
  const canShowActions = canEditList || canDeleteList;
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = params?.listId as string;
  const groupId = searchParams.get("groupId");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddStudentsDialogOpen, setIsAddStudentsDialogOpen] = useState(false);
  const [isCallScriptOpen, setIsCallScriptOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectionMeta, setSelectionMeta] = useState<{ assignedToMe: number; unassigned: number; assignedToOthers: number } | null>(null);
  const [clearSelectionKey, setClearSelectionKey] = useState(0);

  const { data: callList, error, isLoading, mutate: mutateCallList } = useCallList(listId);
  const { data: itemsData, mutate: mutateItems } = useCallListItems(listId, { size: 1000 }); // Get all items for stats
  const batchId = callList?.meta?.batchId;
  const { data: batch } = useBatch(batchId || null);

  usePageTitle(callList ? `${callList.name} - Call List` : "Call List Details");

  const items = itemsData?.items || [];

  const handleEdit = () => {
    setIsFormDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!callList) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteCallList(callList.id);
      toast.success("Call list deleted successfully");
      router.push("/app/call-lists");
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
    await mutateCallList();
  };

  const handleItemsUpdated = async () => {
    await mutateItems();
    await mutateCallList();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call List Details</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  if (error || !callList) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load call list details";
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call List Details</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-0.5 inline-flex items-center gap-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] h-6 text-xs"
            onClick={() => {
              if (groupId && groupsFeature.enabled) {
                router.push(`/app/groups/${groupId}/call-lists`);
              } else {
                router.push("/app/call-lists");
              }
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Call Lists
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--groups1-text)] leading-tight">
              {callList.name}
            </h1>
            {(() => {
              const questions = extractQuestions(callList);
              const hasScript = !!callList.description || (callList.messages && callList.messages.length > 0) || questions.length > 0;
              if (!hasScript) return null;
              return (
                <button
                  type="button"
                  onClick={() => setIsCallScriptOpen(true)}
                  title="View call script"
                  className="flex-shrink-0 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              );
            })()}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {callList.groupId ? (
              <>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  Group:{" "}
                  {groupsFeature.enabled ? (
                    <Link href={`/app/groups/${callList.groupId}`} className="hover:underline text-[var(--groups1-text)]">{callList.group?.name || "Unknown"}</Link>
                  ) : (
                    <span className="text-[var(--groups1-text)]">{callList.group?.name || "Unknown"}</span>
                  )}
                </span>
                {callList.group?.batch && (
                  <span className="text-xs text-[var(--groups1-text-secondary)]">
                    Batch: <Link href={`/app/batches/${callList.group.batch.id}`} className="hover:underline text-[var(--groups1-text)]">{callList.group.batch.name}</Link>
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                Workspace-wide
              </span>
            )}
            {batchId && batch && !callList.group?.batch && (
              <span className="text-xs text-[var(--groups1-text-secondary)]">
                Batch: <Link href={`/app/batches/${batchId}`} className="hover:underline text-[var(--groups1-text)]">{batch.name}</Link>
              </span>
            )}
            <span className="text-xs text-[var(--groups1-text-secondary)]">
              Source: {callList.source}
            </span>
          </div>
        </div>
        <div className="self-start flex items-center gap-2">
          {canEditList && (
            <Button
              size="sm"
              onClick={() => setIsAddStudentsDialogOpen(true)}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:opacity-90 text-xs h-8"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Add Students
            </Button>
          )}
          {canShowActions && (
            <CallListActionsMenu
              onEdit={handleEdit}
              onAddStudents={() => setIsAddStudentsDialogOpen(true)}
              onViewFollowups={() => router.push(`/app/followups?callListId=${listId}`)}
              onViewDetails={() => setIsCallScriptOpen(true)}
              onDelete={handleDelete}
              canEdit={canEditList}
              canAddStudents={canEditList}
              canDelete={canDeleteList}
            />
          )}
        </div>
      </div>

      {/* Stats strip — always expanded */}
      <CollapsibleStatsCard items={items} isLoading={false} />

      {/* Collapsible Filter Criteria (if FILTER source) */}
      {callList.source === "FILTER" && callList.meta?.filters && (
        <CollapsibleFilterCriteria filters={callList.meta.filters} />
      )}


      {/* Collapsible Bulk Actions Toolbar */}
      <CallListBulkActionsToolbar
        listId={listId}
        selectedItemIds={selectedItemIds}
        selectionMeta={selectionMeta || undefined}
        onItemsUpdated={handleItemsUpdated}
        onClearSelection={() => {
          setSelectedItemIds([]);
          setClearSelectionKey((prev) => prev + 1);
        }}
        isAdmin={canManageItems}
      />

      {/* Items Table */}
      <CallListItemsTable
        listId={listId}
        onItemsUpdated={handleItemsUpdated}
        onSelectionChange={setSelectedItemIds}
        onSelectionMetaChange={setSelectionMeta}
        isAdmin={canManageItems}
        clearSelectionKey={clearSelectionKey}
      />

      <CallListFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        callList={callList}
        onSuccess={handleFormSuccess}
      />

      <AddStudentsDialog
        open={isAddStudentsDialogOpen}
        onOpenChange={setIsAddStudentsDialogOpen}
        callListId={listId}
        onSuccess={handleItemsUpdated}
      />


      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delete Call List</DialogTitle>
            <DialogClose onClose={() => setIsDeleteDialogOpen(false)} />
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to delete the call list "{callList.name}"? This action cannot be undone and will delete all associated items.
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

      {/* Call Script modal — triggered by ⓘ icon in header */}
      <Dialog open={isCallScriptOpen} onOpenChange={setIsCallScriptOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Script</DialogTitle>
            <DialogClose onClose={() => setIsCallScriptOpen(false)} />
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {callList.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] mb-2">Description</p>
                <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">{callList.description}</p>
              </div>
            )}
            {callList.messages && callList.messages.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Messages to Convey
                </p>
                <ul className="space-y-1.5">
                  {callList.messages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--groups1-text)]">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center text-[10px] font-bold text-[var(--groups1-text-secondary)]">
                        {i + 1}
                      </span>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(() => {
              const questions = extractQuestions(callList).sort((a, b) => a.order - b.order);
              if (questions.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Questions ({questions.length})
                  </p>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--groups1-primary)] flex items-center justify-center text-[10px] font-bold text-[var(--groups1-btn-primary-text)] mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--groups1-text)]">
                            {q.question}
                            {q.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                              {q.type.replace("_", " ")}
                            </span>
                            {q.type === "multiple_choice" && q.options && (
                              <span className="text-[10px] text-[var(--groups1-text-secondary)]">
                                {q.options.join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CallListDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Call List Details</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    }>
      <CallListDetailPageContent />
    </Suspense>
  );
}

