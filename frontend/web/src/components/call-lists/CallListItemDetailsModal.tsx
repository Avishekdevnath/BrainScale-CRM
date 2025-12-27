"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiClient } from "@/lib/api-client";
import { useCallLog } from "@/hooks/useCallLogs";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "sonner";
import { Loader2, User, Phone, Calendar, Clock, X, Lock, Edit } from "lucide-react";
import { formatCallDuration, formatAnswer, getStatusLabel, getStatusColor, getStateLabel, getStateColor } from "@/lib/call-list-utils";
import type { CallListItem, CallLogStatus, CallListItemState } from "@/types/call-lists.types";
import { mutate } from "swr";

export interface CallListItemDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListItem: CallListItem | null;
  listId: string;
  onUpdated?: () => void;
}

// Map custom status labels to API status values
const STATUS_OPTIONS: Array<{ value: CallLogStatus; label: string }> = [
  { value: "completed", label: "Complete" },
  { value: "busy", label: "Number Busy" },
  { value: "no_answer", label: "Number Off" },
  { value: "other", label: "Abroad Number" },
  { value: "missed", label: "Missed" },
  { value: "voicemail", label: "Voicemail" },
];

// State options for call list items
const STATE_OPTIONS: Array<{ value: CallListItemState; label: string }> = [
  { value: "QUEUED", label: "Queued" },
  { value: "CALLING", label: "Calling" },
  { value: "DONE", label: "Done" },
  { value: "SKIPPED", label: "Skipped" },
];

export function CallListItemDetailsModal({
  open,
  onOpenChange,
  callListItem,
  listId,
  onUpdated,
}: CallListItemDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CallLogStatus | "">("");
  const [itemState, setItemState] = useState<CallListItemState | "">("");
  const [itemPriority, setItemPriority] = useState<number>(0);
  const [specialFeedback, setSpecialFeedback] = useState<string>("");
  
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember, isLoading: isLoadingMember } = useCurrentMember(workspaceId);
  const { data: callLog, isLoading: isLoadingCallLog, mutate: mutateCallLog } = useCallLog(callListItem?.callLogId || null);

  // Check if current user can edit (must be the assigned caller)
  const canEdit = callListItem?.assignedTo 
    ? currentMember?.id === callListItem.assignedTo 
    : false;

  // Initialize form when call log or item loads
  useEffect(() => {
    if (callLog) {
      setNotes(callLog.notes || "");
      setStatus(callLog.status || "");
    } else {
      setNotes("");
      setStatus("");
    }
    
    if (callListItem) {
      setItemState(callListItem.state || "");
      setItemPriority(callListItem.priority || 0);
      // Extract special feedback from custom field
      const custom = callListItem.custom as Record<string, any> | null;
      setSpecialFeedback(custom?.specialFeedback || "");
    } else {
      setItemState("");
      setItemPriority(0);
      setSpecialFeedback("");
    }
  }, [callLog, callListItem]);

  const handleUnassign = async () => {
    if (!callListItem) return;

    setIsUnassigning(true);
    try {
      await apiClient.unassignCallListItems(listId, {
        itemIds: [callListItem.id],
      });
      toast.success("Item unassigned successfully");
      await mutate(`call-list-items-${listId}`);
      onUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to unassign item:", error);
      toast.error(error?.message || "Failed to unassign item");
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleUpdateCallLog = async () => {
    if (!callLog || !status) {
      toast.error("Please select a status");
      return;
    }

    if (!canEdit) {
      toast.error("You can only view this call. Only the assigned caller can edit.");
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.updateCallLog(callLog.id, {
        status: status as CallLogStatus,
        notes: notes || undefined,
      });
      toast.success("Call log updated successfully");
      await mutateCallLog();
      await mutate(`call-list-items-${listId}`);
      // Invalidate dashboard cache to refresh stats
      await mutate(
        (key) => typeof key === "string" && key.startsWith("dashboard/"),
        undefined,
        { revalidate: true }
      );
      onUpdated?.();
    } catch (error: any) {
      console.error("Failed to update call log:", error);
      toast.error(error?.message || "Failed to update call log");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!callListItem || !itemState) {
      toast.error("Please select a state");
      return;
    }

    if (!canEdit) {
      toast.error("You can only view this call. Only the assigned caller can edit.");
      return;
    }

    if (itemPriority < 0 || itemPriority > 100) {
      toast.error("Priority must be between 0 and 100");
      return;
    }

    setIsUpdatingItem(true);
    try {
      // Prepare custom field with special feedback, preserving existing custom fields
      const existingCustom = (callListItem.custom as Record<string, any> | null) || {};
      const custom: Record<string, any> = { ...existingCustom };
      
      // Always update specialFeedback (even if empty, to allow clearing it)
      if (specialFeedback.trim()) {
        custom.specialFeedback = specialFeedback.trim();
      } else {
        // Remove specialFeedback if empty
        delete custom.specialFeedback;
      }
      
      // Only send custom if there are fields to update or if we need to clear it
      // If custom is empty and there was no existing custom, don't send it
      const hasExistingCustom = callListItem.custom && Object.keys(callListItem.custom as Record<string, any>).length > 0;
      const shouldUpdateCustom = Object.keys(custom).length > 0 || hasExistingCustom;
      
      await apiClient.updateCallListItem(callListItem.id, {
        state: itemState as CallListItemState,
        priority: itemPriority,
        custom: shouldUpdateCustom ? custom : undefined,
      });
      toast.success("Call list item updated successfully");
      await mutate(`call-list-items-${listId}`);
      onUpdated?.();
    } catch (error: any) {
      console.error("Failed to update call list item:", error);
      toast.error(error?.message || "Failed to update call list item");
    } finally {
      setIsUpdatingItem(false);
    }
  };

  if (!callListItem) return null;

  const primaryPhone = callListItem.student?.phones?.find((p) => p.isPrimary) || callListItem.student?.phones?.[0];
  const stateColor = getStateColor(callListItem.state);
  const stateVariant = stateColor === "green" ? "success" : stateColor === "red" ? "error" : stateColor === "yellow" ? "warning" : "info";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call List Item Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Information */}
          {callListItem.student && (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">{callListItem.student.name}</span>
                </div>
                {callListItem.student.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{callListItem.student.email}</span>
                  </div>
                )}
                {primaryPhone && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Phone:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">{primaryPhone.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permission Indicator */}
          {isLoadingMember ? (
            <div className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <div className="flex items-center gap-2 text-sm text-[var(--groups1-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking permissions...
              </div>
            </div>
          ) : !canEdit && callListItem.assignedTo ? (
            <div className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-secondary)]">
              <div className="flex items-center gap-2 text-sm text-[var(--groups1-text-secondary)]">
                <Lock className="w-4 h-4" />
                <span>You can only view this call. Only the assigned caller can edit.</span>
              </div>
            </div>
          ) : canEdit ? (
            <div className="p-3 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <div className="flex items-center gap-2 text-sm text-[var(--groups1-primary)]">
                <Edit className="w-4 h-4" />
                <span>You can edit this call as the assigned caller.</span>
              </div>
            </div>
          ) : null}

          {/* Call List Item Information */}
          <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
            <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Call List Item Information
            </h3>
            {canEdit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemState" className="text-sm font-medium text-[var(--groups1-text)]">
                      State *
                    </Label>
                    <select
                      id="itemState"
                      value={itemState}
                      onChange={(e) => setItemState(e.target.value as CallListItemState)}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-md bg-[var(--groups1-background)] border border-[var(--groups1-border)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
                    >
                      <option value="">Select state</option>
                      {STATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="itemPriority" className="text-sm font-medium text-[var(--groups1-text)]">
                      Priority (0-100)
                    </Label>
                    <Input
                      id="itemPriority"
                      type="number"
                      min="0"
                      max="100"
                      value={itemPriority}
                      onChange={(e) => setItemPriority(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="specialFeedback" className="text-sm font-medium text-[var(--groups1-text)]">
                    Special Feedback for Follow-up (Optional)
                  </Label>
                  <textarea
                    id="specialFeedback"
                    value={specialFeedback}
                    onChange={(e) => setSpecialFeedback(e.target.value)}
                    placeholder="Enter special feedback for follow-up..."
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md bg-[var(--groups1-background)] border border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] min-h-[100px] resize-y"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleUpdateItem}
                    disabled={isUpdatingItem || !itemState}
                    className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                  >
                    {isUpdatingItem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Update Item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <StatusBadge variant={stateVariant} size="sm" className="ml-2">
                    {getStateLabel(callListItem.state)}
                  </StatusBadge>
                </div>
                <div>
                  <span className="text-gray-500">Priority:</span>{" "}
                  <span className="font-medium text-[var(--groups1-text)]">{callListItem.priority}</span>
                </div>
                {callListItem.assignee && (
                  <div>
                    <span className="text-gray-500">Assigned To:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {callListItem.assignee.user.name}
                    </span>
                  </div>
                )}
                {callListItem.callList && (
                  <div>
                    <span className="text-gray-500">Call List:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {callListItem.callList.name}
                    </span>
                  </div>
                )}
                {callListItem.custom && typeof callListItem.custom === 'object' && (callListItem.custom as Record<string, any>).specialFeedback && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Special Feedback:</span>
                    <p className="text-[var(--groups1-text)] mt-1 whitespace-pre-wrap bg-[var(--groups1-background)] p-2 rounded border border-[var(--groups1-border)]">
                      {(callListItem.custom as Record<string, any>).specialFeedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Call Log Information */}
          {isLoadingCallLog ? (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
              </div>
            </div>
          ) : callLog ? (
            <>
              <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)] mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Call Log Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Call Date:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {new Date(callLog.callDate).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{" "}
                    <span className="font-medium text-[var(--groups1-text)]">
                      {formatCallDuration(callLog.callDuration)}
                    </span>
                  </div>
                </div>

                {/* Questions and Answers */}
                {callLog.answers && callLog.answers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-2">
                      Questions & Answers
                    </h4>
                    <div className="space-y-2">
                      {callLog.answers.map((answer, index) => (
                        <div
                          key={index}
                          className="p-2 border border-[var(--groups1-border)] rounded bg-[var(--groups1-background)]"
                        >
                          <p className="text-xs font-medium text-[var(--groups1-text)] mb-1">
                            {answer.question}
                          </p>
                          <p className="text-xs text-[var(--groups1-text-secondary)]">
                            {formatAnswer(answer)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary Note */}
                {callLog.summaryNote && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-2">
                      AI Summary Note
                    </h4>
                    <p className="text-sm text-[var(--groups1-text-secondary)] whitespace-pre-wrap bg-[var(--groups1-background)] p-3 rounded border border-[var(--groups1-border)]">
                      {callLog.summaryNote}
                    </p>
                  </div>
                )}

                {/* Follow-up Information */}
                {callLog.followUpRequired && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-2">
                      Follow-up
                    </h4>
                    <div className="text-sm">
                      {callLog.followUpDate && (
                        <span className="text-[var(--groups1-text)]">
                          Follow-up Date: {new Date(callLog.followUpDate).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Update Call Log Form */}
                {canEdit ? (
                  <div className="space-y-4 pt-4 border-t border-[var(--groups1-border)]">
                    <div>
                      <Label htmlFor="status" className="text-sm font-medium text-[var(--groups1-text)]">
                        Status *
                      </Label>
                      <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CallLogStatus)}
                        className="mt-1 w-full px-3 py-2 text-sm rounded-md bg-[var(--groups1-background)] border border-[var(--groups1-border)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8"
                      >
                        <option value="">Select status</option>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium text-[var(--groups1-text)]">
                        Notes
                      </Label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes..."
                        className="mt-1 w-full px-3 py-2 text-sm rounded-md bg-[var(--groups1-background)] border border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] min-h-[100px] resize-y"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleUpdateCallLog}
                        disabled={isUpdating || !status}
                        className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] border-0"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Update Call Log
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[var(--groups1-border)]">
                    <div className="text-sm">
                      <div className="mb-2">
                        <span className="text-gray-500">Status:</span>{" "}
                        <StatusBadge 
                          variant={status === "completed" ? "success" : status === "missed" ? "error" : "info"} 
                          size="sm" 
                          className="ml-2"
                        >
                          {status ? getStatusLabel(status as CallLogStatus) : "Not set"}
                        </StatusBadge>
                      </div>
                      {notes && (
                        <div>
                          <span className="text-gray-500">Notes:</span>
                          <p className="text-[var(--groups1-text)] mt-1 whitespace-pre-wrap">{notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
              <p className="text-sm text-[var(--groups1-text-secondary)] text-center py-4">
                No call log found for this item. Create a call log by starting a call.
              </p>
            </div>
          )}

          {/* Unassign Button - Only show if user can edit */}
          {callListItem.assignedTo && canEdit && (
            <div className="flex justify-end pt-4 border-t border-[var(--groups1-border)]">
              <Button
                variant="destructive"
                onClick={handleUnassign}
                disabled={isUnassigning}
                size="sm"
              >
                {isUnassigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                Unassign
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

