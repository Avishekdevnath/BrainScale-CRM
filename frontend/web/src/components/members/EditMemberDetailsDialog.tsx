"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { mutate } from "swr";
import type { WorkspaceMember } from "@/types/members.types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";

export interface EditMemberDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  onSuccess: () => void;
}

export function EditMemberDetailsDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onSuccess,
}: EditMemberDetailsDialogProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const authUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);

  // Sync form when member changes or dialog opens
  React.useEffect(() => {
    if (member && open) {
      setName(member.user.name ?? "");
      setEmail(member.user.email ?? "");
      setError(null);
    }
  }, [member, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const nameChanged = trimmedName !== (member.user.name ?? "");
    const emailChanged = trimmedEmail !== member.user.email;

    if (!nameChanged && !emailChanged) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: { name?: string; email?: string } = {};
      if (nameChanged) payload.name = trimmedName;
      if (emailChanged) payload.email = trimmedEmail;

      const updated = await apiClient.updateMemberUser(workspaceId, member.id, payload);
      toast.success("Member details updated");

      // If editing the currently logged-in user, sync the auth store so
      // the settings page and other UI reflect the new name/email immediately.
      if (authUser && member.userId === authUser.id) {
        setAuthUser({ id: authUser.id, name: updated.name, email: updated.email });
      }

      await mutate(`workspace-members-${workspaceId}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update member details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member Details</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-member-name">Name</Label>
            <input
              id="edit-member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Full name"
              className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-3 py-2 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)] disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-member-email">Email</Label>
            <input
              id="edit-member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="email@example.com"
              className="w-full rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-3 py-2 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)] disabled:opacity-60"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
