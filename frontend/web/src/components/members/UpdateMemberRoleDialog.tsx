"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LevelBadge } from "@/components/members/LevelBadge";
import { useUpdateMember } from "@/hooks/useMembers";
import type { WorkspaceMember, UpdateMemberPayload } from "@/types/members.types";
import useSWR from "swr";
import { Loader2, AlertTriangle } from "lucide-react";
import { getMemberLevel, getMemberRoleName } from "@/lib/member-utils";
import { apiClient } from "@/lib/api-client";
import type { CustomRole } from "@/types/roles.types";

export interface UpdateMemberRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  onSuccess: () => void;
  allMembers?: WorkspaceMember[]; // For last-admin guard
}

export function UpdateMemberRoleDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onSuccess,
  allMembers = [],
}: UpdateMemberRoleDialogProps) {
  const [customRoleId, setCustomRoleId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const updateMember = useUpdateMember(workspaceId);
  const { data: roles, isLoading: isLoadingRoles } = useSWR<CustomRole[]>(
    workspaceId ? `custom-roles-${workspaceId}` : null,
    () => apiClient.listCustomRoles(workspaceId),
    { revalidateOnFocus: false }
  );

  // Owner role is non-transferable — never selectable
  const assignableRoles = React.useMemo(
    () => (roles || []).filter((r) => r.level !== "OWNER"),
    [roles]
  );

  const selectedRole = React.useMemo(
    () => assignableRoles.find((r) => r.id === customRoleId) || null,
    [assignableRoles, customRoleId]
  );

  // Last-admin guard: block demoting the only OWNER/ADMIN-level member
  const isLastAdmin = React.useMemo(() => {
    if (!member) return false;
    const memberLevel = getMemberLevel(member);
    if (memberLevel !== "OWNER" && memberLevel !== "ADMIN") return false;
    const adminCount = allMembers.filter((m) => {
      const lvl = getMemberLevel(m);
      return lvl === "OWNER" || lvl === "ADMIN";
    }).length;
    return adminCount <= 1;
  }, [member, allMembers]);

  const targetIsAdminLevel =
    selectedRole?.level === "ADMIN" || selectedRole?.level === "OWNER";
  const isDemotingLastAdmin = isLastAdmin && !!selectedRole && !targetIsAdminLevel;

  React.useEffect(() => {
    if (member) {
      setCustomRoleId(member.customRoleId || "");
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setErrors({});

    if (!customRoleId) {
      setErrors({ customRoleId: "Please select a role" });
      return;
    }

    const payload: UpdateMemberPayload = { customRoleId };

    setIsSubmitting(true);
    try {
      await updateMember(member.id, payload);
      onSuccess();
      handleClose();
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomRoleId("");
    setErrors({});
    onOpenChange(false);
  };

  if (!member) return null;

  const currentLevel = getMemberLevel(member);

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
            <div className="mt-1 p-2 bg-[var(--groups1-secondary)] rounded-md flex items-center gap-2">
              <p className="text-sm text-[var(--groups1-text)]">{getMemberRoleName(member)}</p>
              <LevelBadge level={currentLevel} />
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
                  This is the only Owner/Admin-level member. Promote another member first, or assign an admin-level role.
                </p>
              </div>
            </div>
          )}

          {/* Role picker */}
          <div className="space-y-2">
            <Label>Role *</Label>
            <select
              value={customRoleId}
              onChange={(e) => setCustomRoleId(e.target.value)}
              disabled={isSubmitting || isLoadingRoles}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              aria-label="Select role"
            >
              <option value="">{isLoadingRoles ? "Loading roles..." : "Select a role"}</option>
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.isSystem ? "" : " (custom)"}
                </option>
              ))}
            </select>
            {errors.customRoleId ? (
              <p className="text-xs text-red-600">{errors.customRoleId}</p>
            ) : null}
            {selectedRole ? (
              <div className="flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                <LevelBadge level={selectedRole.level} />
                <span>{selectedRole.permissions?.length || 0} permissions</span>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
