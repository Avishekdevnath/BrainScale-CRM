"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallListItem } from "@/types/call-lists.types";

export interface FollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callListItem: CallListItem | null;
  onSave: (data: {
    followUpRequired: boolean;
    followUpDate?: string;
    followUpNote?: string;
  }) => void;
}

export function FollowUpModal({
  open,
  onOpenChange,
  callListItem,
  onSave,
}: FollowUpModalProps) {
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (open && callListItem) {
      // Pre-populate with existing follow-up data from call log if available
      if (callListItem.callLog?.followUpRequired) {
        setFollowUpRequired(true);
        if (callListItem.callLog.followUpDate) {
          const date = new Date(callListItem.callLog.followUpDate);
          setFollowUpDate(date.toISOString().split("T")[0]);
        } else {
          setFollowUpDate("");
        }
        setFollowUpNote(callListItem.callLog.followUpNote || "");
      } else {
        setFollowUpRequired(false);
        setFollowUpDate("");
        setFollowUpNote("");
      }
    }
  }, [open, callListItem]);

  const handleSave = () => {
    onSave({
      followUpRequired,
      followUpDate: followUpRequired && followUpDate ? followUpDate : undefined,
      followUpNote: followUpRequired && followUpNote.trim() ? followUpNote.trim() : undefined,
    });
    onOpenChange(false);
  };

  const student = callListItem?.student;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Follow-up for {student?.name || "Student"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Follow-up Required Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={followUpRequired}
              onChange={(e) => setFollowUpRequired(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-[var(--groups1-focus-ring)]"
            />
            <Label htmlFor="followUpRequired" className="text-sm font-medium text-[var(--groups1-text)] cursor-pointer">
              Follow-up Required
            </Label>
          </div>

          {/* Follow-up Date and Note (shown when checked) */}
          {followUpRequired && (
            <div className="space-y-4 pt-2 border-t border-[var(--groups1-border)]">
              <div className="space-y-2">
                <Label htmlFor="followUpDate" className="text-sm font-medium text-[var(--groups1-text)]">
                  Follow-up Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
                  <Input
                    id="followUpDate"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className={cn(
                      "pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)]",
                      "text-[var(--groups1-text)] focus-visible:border-[var(--groups1-primary)]"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpNote" className="text-sm font-medium text-[var(--groups1-text)]">
                  Follow-up Note
                </Label>
                <textarea
                  id="followUpNote"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note for the follow-up call..."
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                    "resize-none placeholder:text-[var(--groups1-text-secondary)]"
                  )}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

