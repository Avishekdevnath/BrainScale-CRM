"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface AddStudentsToCallListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  onSuccess?: () => void;
}

export function AddStudentsToCallListDialog({
  open,
  onOpenChange,
  studentIds,
  onSuccess,
}: AddStudentsToCallListDialogProps) {
  const [isLoadingLists, setIsLoadingLists] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [callLists, setCallLists] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedListId, setSelectedListId] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setIsLoadingLists(true);
      try {
        const response = await apiClient.getCallLists({ status: "ACTIVE" });
        if (cancelled) return;
        setCallLists(response.callLists.map((cl) => ({ id: cl.id, name: cl.name })));
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Failed to load call lists");
      } finally {
        if (!cancelled) setIsLoadingLists(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setSelectedListId("");
      setIsSubmitting(false);
      return;
    }
    if (callLists.length === 1) setSelectedListId(callLists[0].id);
  }, [open, callLists]);

  const handleSubmit = async () => {
    if (!selectedListId || studentIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await apiClient.addCallListItems(selectedListId, { studentIds });
      toast.success(`${result.added ?? studentIds.length} student(s) added to call list`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to add students to call list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Call List</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Add {studentIds.length} selected student(s) to a call list.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
              Call List
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              disabled={isLoadingLists || isSubmitting}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
            >
              <option value="">{isLoadingLists ? "Loading..." : "Select a call list"}</option>
              {callLists.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedListId || isSubmitting || studentIds.length === 0}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

