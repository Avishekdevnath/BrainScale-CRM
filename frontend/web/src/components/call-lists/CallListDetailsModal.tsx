"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCallList, useCallListItems } from "@/hooks/useCallLists";
import { CallListItemDetailsModal } from "./CallListItemDetailsModal";
import { getStateLabel, getStateColor } from "@/lib/call-list-utils";
import { Loader2, Phone, Eye, ExternalLink, FolderOpen, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CallListItem } from "@/types/call-lists.types";

export interface CallListDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListId: string | null;
}

export function CallListDetailsModal({
  open,
  onOpenChange,
  callListId,
}: CallListDetailsModalProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<CallListItem | null>(null);
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false);

  const { data: callList, isLoading: isLoadingCallList, error: callListError } = useCallList(callListId || "");
  const { data: itemsData, isLoading: isLoadingItems } = useCallListItems(callListId || "", { 
    size: 100, // Show first 100 items
    page: 1 
  });

  const items = itemsData?.items || [];
  const totalItems = itemsData?.pagination?.total || 0;

  const handleViewItemDetails = (item: CallListItem) => {
    setSelectedItem(item);
    setIsItemDetailsOpen(true);
  };

  const handleViewFullPage = () => {
    if (callListId) {
      router.push(`/app/call-lists/${callListId}`);
      onOpenChange(false);
    }
  };

  if (!callListId || !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => onOpenChange(false)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call List Details
            </DialogTitle>
          </DialogHeader>

          {isLoadingCallList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
            </div>
          ) : callListError || !callList ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {callListError instanceof Error ? callListError.message : "Failed to load call list"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Call List Overview */}
              <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Call List Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{callList.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Source:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{callList.source}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Items:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{totalItems}</span>
                  </div>
                  {callList.groupId ? (
                    <div>
                      <span className="text-gray-500">Group:</span>{" "}
                      <Link 
                        href={`/app/groups/${callList.groupId}`}
                        className="font-medium text-[var(--groups1-primary)] hover:underline"
                      >
                        {callList.group?.name || "Unknown"}
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-500">Scope:</span>{" "}
                      <span className="font-medium text-[var(--groups1-text)]">Workspace-wide</span>
                    </div>
                  )}
                  {callList.group?.batch && (
                    <div>
                      <span className="text-gray-500">Batch:</span>{" "}
                      <Link 
                        href={`/app/batches/${callList.group.batch.id}`}
                        className="font-medium text-[var(--groups1-primary)] hover:underline"
                      >
                        {callList.group.batch.name}
                      </Link>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Created:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {new Date(callList.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {callList.description && (
                  <div className="mt-3 pt-3 border-t border-[var(--groups1-border)]">
                    <span className="text-gray-500 text-sm">Description:</span>
                    <p className="text-sm text-[var(--groups1-text)] mt-1">{callList.description}</p>
                  </div>
                )}
              </div>

              {/* Assigned Calls Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--groups1-text)] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assigned Calls {totalItems > 0 && `(${totalItems})`}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewFullPage}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Full Page
                  </Button>
                </div>

                {isLoadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-primary)]" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-8 text-center border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                    <p className="text-sm text-[var(--groups1-text-secondary)]">No calls assigned yet.</p>
                  </div>
                ) : (
                  <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[var(--groups1-border)]">
                        <thead className="bg-[var(--groups1-secondary)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Phone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Call List
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Group
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-[var(--groups1-background)] divide-y divide-[var(--groups1-border)]">
                          {items.map((item) => {
                            const primaryPhone = item.student?.phones?.find((p) => p.isPrimary) || item.student?.phones?.[0];
                            const stateColor = getStateColor(item.state);
                            const stateVariant = stateColor === "green" ? "success" : stateColor === "red" ? "error" : stateColor === "yellow" ? "warning" : "info";
                            
                            return (
                              <tr key={item.id} className="hover:bg-[var(--groups1-secondary)]">
                                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                                  {item.student?.name || "Unknown"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {primaryPhone ? (
                                    <a
                                      href={`tel:${primaryPhone.phone}`}
                                      className="text-[var(--groups1-primary)] hover:underline"
                                    >
                                      {primaryPhone.phone}
                                    </a>
                                  ) : (
                                    <span className="text-[var(--groups1-text-secondary)]">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                                  {callList.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                                  {item.student?.groups?.[0]?.name || callList.group?.name || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <StatusBadge variant={stateVariant} size="sm">
                                    {getStateLabel(item.state)}
                                  </StatusBadge>
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)]">
                                  {item.callLog?.callDate 
                                    ? new Date(item.callLog.callDate).toLocaleDateString()
                                    : new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewItemDetails(item)}
                                    className="text-xs"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalItems > items.length && (
                      <div className="px-4 py-3 bg-[var(--groups1-secondary)] text-center text-xs text-[var(--groups1-text-secondary)] border-t border-[var(--groups1-border)]">
                        Showing {items.length} of {totalItems} calls.{" "}
                        <Button
                          variant="link"
                          size="sm"
                          onClick={handleViewFullPage}
                          className="text-xs h-auto p-0 ml-1"
                        >
                          View all
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Call List Item Details Modal */}
      {selectedItem && callListId && (
        <CallListItemDetailsModal
          open={isItemDetailsOpen}
          onOpenChange={setIsItemDetailsOpen}
          callListItem={selectedItem}
          listId={callListId}
          onUpdated={() => {
            // Refresh items when updated - SWR will automatically refetch
          }}
        />
      )}
    </>
  );
}

