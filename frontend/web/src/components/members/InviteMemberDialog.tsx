"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteMember } from "@/hooks/useMembers";
import type { InviteMemberPayload, InviteMemberResponse } from "@/types/members.types";
import { Loader2, Copy, Check, Mail, KeyRound } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { toast } from "sonner";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { CustomRole } from "@/types/roles.types";
import { LevelBadge } from "@/components/members/LevelBadge";

export interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: InviteMemberDialogProps) {
  const [email, setEmail] = React.useState("");
  const [customRoleId, setCustomRoleId] = React.useState<string>("");
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // State for the success modal with password
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [invitationResult, setInvitationResult] = React.useState<InviteMemberResponse | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const inviteMember = useInviteMember(workspaceId);
  const { data: groups } = useGroups({ isActive: true });
  const invitedEmail = invitationResult?.user?.email || "";

  const { data: roles, isLoading: isLoadingRoles } = useSWR<CustomRole[]>(
    workspaceId ? `custom-roles-${workspaceId}` : null,
    () => apiClient.listCustomRoles(workspaceId),
    { revalidateOnFocus: false }
  );

  // Owner non-transferable — never offered when inviting
  const assignableRoles = React.useMemo(
    () => (roles || []).filter((r) => r.level !== "OWNER"),
    [roles]
  );

  const selectedRole = React.useMemo(
    () => assignableRoles.find((r) => r.id === customRoleId) || null,
    [assignableRoles, customRoleId]
  );

  // Default to the Member system role once roles load
  React.useEffect(() => {
    if (!customRoleId && assignableRoles.length > 0) {
      const memberRole = assignableRoles.find((r) => r.level === "MEMBER");
      setCustomRoleId(memberRole?.id || assignableRoles[0].id);
    }
  }, [assignableRoles, customRoleId]);

  const resetFormState = () => {
    setEmail("");
    setCustomRoleId("");
    setSelectedGroupIds([]);
    setErrors({});
    setCopiedField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!email.includes("@")) {
      setErrors({ email: "Invalid email address" });
      return;
    }

    if (!customRoleId) {
      setErrors({ customRoleId: "Please select a role" });
      return;
    }

    const payload: InviteMemberPayload = {
      email,
      customRoleId,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
    };

    setIsSubmitting(true);
    try {
      const result = await inviteMember(payload);

      if (result.accountCreated) {
        setInvitationResult(result);
        setShowPasswordModal(true);
        resetFormState();
        onOpenChange(false);
      } else {
        toast.info(
          "User already has an account. No temporary password was generated. Use Re-invite to reset and get a new temporary password."
        );
        resetFormState();
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetFormState();
    setShowPasswordModal(false);
    setInvitationResult(null);
    onOpenChange(false);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyBothCredentials = async () => {
    const password = invitationResult?.temporaryPassword || "";
    const text = `Email: \`${invitedEmail}\`
Temporary Password: \`${password}\`

For BrainScale CRM
Please login from here: https://brain-scale-crm.vercel.app`;
    await copyToClipboard(text, "both");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setInvitationResult(null);
    resetFormState();
    onSuccess();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={handleClose} />
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
                className="mt-1"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <Label htmlFor="invite-role">Role *</Label>
              <select
                id="invite-role"
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
                disabled={isSubmitting || isLoadingRoles}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
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
              {errors.customRoleId && (
                <p className="mt-1 text-sm text-red-600">{errors.customRoleId}</p>
              )}
              {selectedRole && (
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                  <LevelBadge level={selectedRole.level} />
                  <span>{selectedRole.permissions?.length || 0} permissions</span>
                </div>
              )}
            </div>

            {/* Group Access */}
            <div>
              <Label>Group Access (Optional)</Label>
              <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--groups1-border)] rounded-md p-2 space-y-2">
                {!groups || groups.length === 0 ? (
                  <p className="text-sm text-[var(--groups1-text-secondary)]">
                    No groups available
                  </p>
                ) : (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-[var(--groups1-secondary)] p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        disabled={isSubmitting}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-[var(--groups1-text)]">{group.name}</span>
                    </label>
                  ))
                )}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Modal - Show when new user is invited */}
      <Dialog open={showPasswordModal} onOpenChange={(open) => !open && closePasswordModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Member Invited Successfully
            </DialogTitle>
      </DialogHeader>
          
          <div className="space-y-4">
            {invitationResult?.emailSent ? (
              <>
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  Login credentials were emailed to{" "}
                  <span className="font-medium text-[var(--groups1-text)]">{invitedEmail}</span>.
                </p>

                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                  The invited member should use the temporary password from the email to log in and complete setup.
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={closePasswordModal}>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--groups1-text-secondary)]">
                  Email delivery failed for this invite. Copy the credentials below and share them manually.
                </p>

                {/* Email */}
                <div className="bg-[var(--groups1-secondary)] p-3 rounded-lg">
                  <Label className="text-xs text-[var(--groups1-text-secondary)] flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email Address
                  </Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-medium text-[var(--groups1-text)]">
                      {invitedEmail}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(invitedEmail, "email")}
                      className="h-8"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Temporary Password */}
                <div className="bg-[var(--groups1-secondary)] p-3 rounded-lg">
                  <Label className="text-xs text-[var(--groups1-text-secondary)] flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Temporary Password
                  </Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-medium text-[var(--groups1-text)]">
                      {invitationResult?.temporaryPassword}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(invitationResult?.temporaryPassword || "", "password")}
                      className="h-8"
                    >
                      {copiedField === "password" ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-[var(--groups1-text-secondary)] bg-yellow-50 p-2 rounded border border-yellow-200">
                  Warning: This password will only be shown once. Please copy it now and share it securely with the invited member.
                </p>

                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyBothCredentials}
                    className="gap-2"
                  >
                    {copiedField === "both" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    Copy Both
                  </Button>
                  <Button onClick={closePasswordModal}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

