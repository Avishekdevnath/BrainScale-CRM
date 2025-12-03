"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteMember } from "@/hooks/useMembers";
import type { InviteMemberPayload } from "@/types/members.types";
import { Loader2 } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

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
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER" | "CUSTOM">("MEMBER");
  const [customRoleId, setCustomRoleId] = React.useState<string>("");
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const inviteMember = useInviteMember(workspaceId);
  const { groups } = useGroups({ isActive: true });

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

    if (role === "CUSTOM" && !customRoleId) {
      setErrors({ customRole: "Please select a custom role" });
      return;
    }

    // XOR validation: either role OR customRoleId, not both
    const payload: InviteMemberPayload = {
      email,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
    };

    if (role === "CUSTOM") {
      payload.customRoleId = customRoleId;
    } else {
      payload.role = role;
    }

    setIsSubmitting(true);
    try {
      await inviteMember(payload);
      onSuccess();
      handleClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("MEMBER");
    setCustomRoleId("");
    setSelectedGroupIds([]);
    setErrors({});
    onOpenChange(false);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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

          {/* Group Access */}
          <div>
            <Label>Group Access (Optional)</Label>
            <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--groups1-border)] rounded-md p-2 space-y-2">
              {groups.length === 0 ? (
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
  );
}

