"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateMemberWithAccount } from "@/hooks/useMembers";
import type { CreateMemberWithAccountPayload } from "@/types/members.types";
import { Loader2 } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

export interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess: () => void;
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: CreateMemberDialogProps) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<"ADMIN" | "MEMBER">("MEMBER");
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const createMember = useCreateMemberWithAccount(workspaceId);
  const { data: groups } = useGroups({ isActive: true });

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

    if (name && name.length < 2) {
      setErrors({ name: "Name must be at least 2 characters" });
      return;
    }

    const payload: CreateMemberWithAccountPayload = {
      email,
      name: name || undefined,
      phone: phone || undefined,
      role: role,
      groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
    };

    setIsSubmitting(true);
    try {
      await createMember(payload);
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
    setName("");
    setPhone("");
    setRole("MEMBER");
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
      <DialogContent className="max-w-xl">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Create Member Account</DialogTitle>
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

          {/* Name */}
          <div>
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="mt-1"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="mt-1"
              disabled={isSubmitting}
            />
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

          {/* Info */}
          <div className="p-3 bg-[var(--groups1-secondary)] rounded-md">
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              A temporary password will be sent to the member's email. They must complete setup
              (change password and accept agreement) before gaining full workspace access.
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

