"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateMember } from "@/hooks/useMembers";
import type { WorkspaceMember, UpdateMemberPayload } from "@/types/members.types";
import { Loader2 } from "lucide-react";
import { getRoleLabel } from "@/lib/member-utils";

export interface UpdateMemberRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  onSuccess: () => void;
}

export function UpdateMemberRoleDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onSuccess,
}: UpdateMemberRoleDialogProps) {
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER" | "CUSTOM">("MEMBER");
  const [customRoleId, setCustomRoleId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const updateMember = useUpdateMember(workspaceId);

  React.useEffect(() => {
    if (member) {
      if (member.customRoleId) {
        setRole("CUSTOM");
        setCustomRoleId(member.customRoleId);
      } else {
        setRole(member.role);
        setCustomRoleId("");
      }
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setErrors({});

    if (role === "CUSTOM" && !customRoleId) {
      setErrors({ customRole: "Please select a custom role" });
      return;
    }

    const payload: UpdateMemberPayload = {};
    if (role === "CUSTOM") {
      payload.customRoleId = customRoleId;
    } else {
      payload.role = role;
    }

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
    setCustomRoleId("");
    setErrors({});
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
                {member.customRole
                  ? `Custom: ${member.customRole.name}`
                  : getRoleLabel(member.role)}
              </p>
            </div>
          </div>

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
                  onChange={() => {
                    setRole("MEMBER");
                    setCustomRoleId("");
                  }}
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
                  onChange={() => {
                    setRole("ADMIN");
                    setCustomRoleId("");
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--groups1-text)]">Admin</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="CUSTOM"
                  checked={role === "CUSTOM"}
                  onChange={() => setRole("CUSTOM")}
                  disabled={isSubmitting}
                  className="w-4 h-4"
                />
                <span className="text-sm text-[var(--groups1-text)]">Custom Role</span>
              </label>
            </div>
            {role === "CUSTOM" && (
              <div className="mt-2">
                <select
                  value={customRoleId}
                  onChange={(e) => setCustomRoleId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--groups1-background)] border border-[var(--groups1-border)] rounded-md text-[var(--groups1-text)]"
                  disabled={isSubmitting}
                >
                  <option value="">Select custom role...</option>
                  {/* TODO: Fetch custom roles from API */}
                  <option value="" disabled>
                    Custom roles not yet implemented
                  </option>
                </select>
                {errors.customRole && (
                  <p className="mt-1 text-sm text-red-600">{errors.customRole}</p>
                )}
              </div>
            )}
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
            <Button type="submit" disabled={isSubmitting}>
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

