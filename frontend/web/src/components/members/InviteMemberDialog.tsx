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
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER">("MEMBER");
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

  const resetFormState = () => {
    setEmail("");
    setRole("MEMBER");
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

    const payload: InviteMemberPayload = {
      email,
      role: role,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
    };

    setIsSubmitting(true);
    try {
      const result = await inviteMember(payload);
      const createdAccount =
        typeof result.accountCreated === "boolean"
          ? result.accountCreated
          : Boolean(result.temporaryPassword);

      if (createdAccount && result.temporaryPassword) {
        setInvitationResult(result);
        setShowPasswordModal(true);
        resetFormState();
        onOpenChange(false);
      } else if (createdAccount && !result.temporaryPassword) {
        toast.error("Account created but temporary password was not returned.");
        resetFormState();
        onOpenChange(false);
        onSuccess();
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
              <Label>Role *</Label>
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
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              A new account has been created for the invited member. Since email service is currently disabled, 
              please copy the credentials below and send them manually.
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

