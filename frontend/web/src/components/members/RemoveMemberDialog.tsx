"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRemoveMember } from "@/hooks/useMembers";
import type { WorkspaceMember } from "@/types/members.types";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatMemberName } from "@/lib/member-utils";

export interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  currentUserId?: string;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  currentUserId,
  onSuccess,
}: RemoveMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const removeMember = useRemoveMember(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setIsSubmitting(true);
    try {
      await removeMember(member.id);
      onSuccess();
      handleClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!member) return null;

  const isCurrentUser = currentUserId === member.userId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Are you sure you want to remove this member?
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {formatMemberName(member)} will lose access to this workspace. This action cannot
                be undone.
              </p>
            </div>
          </div>

          {/* Member Info */}
          <div className="p-3 bg-[var(--groups1-secondary)] rounded-md">
            <p className="text-sm text-[var(--groups1-text)]">
              <span className="font-medium">Member:</span> {formatMemberName(member)}
            </p>
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
              <span className="font-medium">Email:</span> {member.user.email}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isCurrentUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </div>

          {isCurrentUser && (
            <p className="text-xs text-red-600 text-center">
              You cannot remove yourself from the workspace.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

