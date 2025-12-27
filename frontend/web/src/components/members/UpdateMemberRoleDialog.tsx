"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateMember } from "@/hooks/useMembers";
import type { WorkspaceMember, UpdateMemberPayload } from "@/types/members.types";
import { Loader2, AlertTriangle } from "lucide-react";
import { getRoleLabel } from "@/lib/member-utils";

export interface UpdateMemberRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  onSuccess: () => void;
  allMembers?: WorkspaceMember[]; // For checking if this is the last admin
}

export function UpdateMemberRoleDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onSuccess,
  allMembers = [],
}: UpdateMemberRoleDialogProps) {
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER">("MEMBER");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const updateMember = useUpdateMember(workspaceId);

  // Check if this is the last admin
  const isLastAdmin = React.useMemo(() => {
    if (!member || member.role !== "ADMIN") return false;
    const adminCount = allMembers.filter((m) => m.role === "ADMIN").length;
    return adminCount <= 1;
  }, [member, allMembers]);

  // Check if trying to demote the last admin
  const isDemotingLastAdmin = isLastAdmin && role === "MEMBER";

  React.useEffect(() => {
    if (member) {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setErrors({});

    const payload: UpdateMemberPayload = {
      role: role,
    };

    setIsSubmitting(true);
    try {
      await updateMember(member.id, payload);
      onSuccess();
      handleClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRole("MEMBER");
    setErrors({});
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Update Member Role</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Role Display */}
          <div>
            <Label>Current Role</Label>
            <div className="mt-1 p-2 bg-[var(--groups1-secondary)] rounded-md">
              <p className="text-sm text-[var(--groups1-text)]">
                {getRoleLabel(member.role)}
              </p>
            </div>
          </div>

          {/* Warning if trying to demote last admin */}
          {isDemotingLastAdmin && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Cannot demote the last admin
                </p>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  This member is the only admin. Please promote another member to admin first before demoting this one.
                </p>
              </div>
            </div>
          )}

          {/* New Role Selection */}
          <div>
            <Label>New Role *</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="MEMBER"
                  checked={role === "MEMBER"}
                  onChange={() => setRole("MEMBER")}
                  disabled={isSubmitting}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--groups1-text)]">Member</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={role === "ADMIN"}
                  onChange={() => setRole("ADMIN")}
                  disabled={isSubmitting}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--groups1-text)]">Admin</span>
              </label>
            </div>
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
            <Button type="submit" disabled={isSubmitting || isDemotingLastAdmin}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

