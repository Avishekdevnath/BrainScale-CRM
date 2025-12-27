"use client";

import { useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useCallList, useCallListItems } from "@/hooks/useCallLists";
import { CallListStatsCard } from "@/components/call-lists/CallListStatsCard";
import { CallListItemsTable } from "@/components/call-lists/CallListItemsTable";
import { CallListQuickActions } from "@/components/call-lists/CallListQuickActions";
import { CallListFormDialog } from "@/components/call-lists/CallListFormDialog";
import { AddStudentsDialog } from "@/components/call-lists/AddStudentsDialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBatch } from "@/hooks/useBatches";
import { apiClient } from "@/lib/api-client";
import { extractQuestions } from "@/lib/call-list-utils";
import { Loader2, ArrowLeft, Pencil, Trash2, UserPlus, MessageSquare, HelpCircle, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { useIsAdmin } from "@/hooks/useIsAdmin";

function CallListDetailPageContent() {
  const isAdmin = useIsAdmin();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = params?.listId as string;
  const groupId = searchParams.get("groupId");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddStudentsDialogOpen, setIsAddStudentsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 inline-flex items-center gap-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] h-7"
            onClick={() => {
              if (groupId) {
                router.push(`/app/groups/${groupId}/call-lists`);
              } else {
                router.push("/app/call-lists");
              }
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Call Lists
          </Button>
          <h1 className="text-xl font-bold text-[var(--groups1-text)] leading-tight">
            {callList.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {callList.groupId ? (
              <>
                <span className="text-xs text-[var(--groups1-text-secondary)]">
                  Group: <Link href={`/app/groups/${callList.groupId}`} className="hover:underline text-[var(--groups1-text)]">{callList.group?.name || "Unknown"}</Link>
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
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push(`/app/followups?callListId=${listId}`)}
              variant="outline"
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              <Clock className="w-4 h-4 mr-2" />
              View Follow-ups
            </Button>
            <Button
              onClick={() => setIsAddStudentsDialogOpen(true)}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Students
            </Button>
            <Button
              onClick={handleEdit}
              variant="outline"
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <CallListStatsCard items={items} isLoading={false} />

      {/* Call List Details Button */}
      {(() => {
        const questions = extractQuestions(callList);
        const hasDescription = !!callList.description;
        const hasMessages = callList.messages && callList.messages.length > 0;
        const hasQuestions = questions.length > 0;
        
        if (!hasDescription && !hasMessages && !hasQuestions) return null;
        
        return (
          <Button
            onClick={() => setIsDetailsModalOpen(true)}
            variant="outline"
            size="sm"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] h-8"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            View Details
          </Button>
        );
      })()}

      {/* Filter Criteria Display (if FILTER source) */}
      {callList.source === "FILTER" && callList.meta?.filters && (
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Filter Criteria</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {callList.meta.filters.batchId && (
                <div>
                  <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                    Batch
                  </div>
                  <div className="text-sm font-medium text-[var(--groups1-text)]">
                    {callList.meta.filters.batchId}
                  </div>
                </div>
              )}
              {callList.meta.filters.groupId && (
                <div>
                  <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                    Group
                  </div>
                  <div className="text-sm font-medium text-[var(--groups1-text)]">
                    {callList.meta.filters.groupId}
                  </div>
                </div>
              )}
              {callList.meta.filters.status && (
                <div>
                  <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                    Status
                  </div>
                  <div className="text-sm font-medium text-[var(--groups1-text)]">
                    {callList.meta.filters.status}
                  </div>
                </div>
              )}
              {callList.meta.filters.q && (
                <div>
                  <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                    Search
                  </div>
                  <div className="text-sm font-medium text-[var(--groups1-text)]">
                    {callList.meta.filters.q}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {selectedItemIds.length > 0 && (
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <CallListQuickActions
              listId={listId}
              selectedItemIds={selectedItemIds}
              onItemsUpdated={handleItemsUpdated}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <CallListItemsTable
        listId={listId}
        onItemsUpdated={handleItemsUpdated}
        onSelectionChange={setSelectedItemIds}
        isAdmin={isAdmin}
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

      {/* Call List Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setIsDetailsModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>Call List Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Description */}
            {callList.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--groups1-text)]">Description</h3>
                <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                  <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">
                    {callList.description}
                  </p>
                </div>
              </div>
            )}

            {/* Messages to Convey */}
            {callList.messages && callList.messages.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--groups1-text)] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Messages to Convey
                </h3>
                <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                  <ul className="list-disc list-inside space-y-2 text-sm text-[var(--groups1-text)]">
                    {callList.messages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Questions to Ask */}
            {(() => {
              const questions = extractQuestions(callList);
              return questions.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--groups1-text)] flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Questions to Ask
                  </h3>
                  <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                    <div className="space-y-4">
                      {questions
                        .sort((a, b) => a.order - b.order)
                        .map((question) => (
                          <div
                            key={question.id}
                            className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-background)]"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-[var(--groups1-text)]">
                                {question.question}
                                {question.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </p>
                              <span className="text-xs px-2 py-1 rounded bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                                {question.type.replace("_", " ")}
                              </span>
                            </div>
                            {question.type === "multiple_choice" && question.options && (
                              <div className="mt-2">
                                <p className="text-xs text-[var(--groups1-text-secondary)] mb-1">Options:</p>
                                <ul className="list-disc list-inside text-xs text-[var(--groups1-text)] space-y-1">
                                  {question.options.map((option, idx) => (
                                    <li key={idx}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </DialogContent>
      </Dialog>

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

