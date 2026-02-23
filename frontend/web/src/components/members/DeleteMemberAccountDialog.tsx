"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteMemberAccount } from "@/hooks/useMembers";
import type { WorkspaceMember } from "@/types/members.types";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatMemberName } from "@/lib/member-utils";

export interface DeleteMemberAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  currentUserId?: string;
  onSuccess: () => void;
}

export function DeleteMemberAccountDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  currentUserId,
  onSuccess,
}: DeleteMemberAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const deleteMemberAccount = useDeleteMemberAccount(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setIsSubmitting(true);
    try {
      await deleteMemberAccount(member.id);
      onSuccess();
      handleClose();
    } catch {
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
      <DialogContent className="max-w-xl">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Delete User Account</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                This will permanently delete the user account from the database.
              </p>
              <p className="mt-1 text-sm text-red-700">
                The user will be removed from all workspaces and their related account data will be deleted.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[var(--groups1-secondary)] rounded-md">
            <p className="text-sm text-[var(--groups1-text)]">
              <span className="font-medium">Member:</span> {formatMemberName(member)}
            </p>
            <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
              <span className="font-medium">Email:</span> {member.user.email}
            </p>
          </div>

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
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account Permanently"
              )}
            </Button>
          </div>

          {isCurrentUser ? (
            <p className="text-xs text-red-600 text-center">
              You cannot delete your own account from this screen.
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

