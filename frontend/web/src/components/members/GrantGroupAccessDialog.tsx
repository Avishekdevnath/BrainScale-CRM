"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGrantGroupAccess } from "@/hooks/useMembers";
import type { WorkspaceMember, GrantGroupAccessPayload } from "@/types/members.types";
import { Loader2, X } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

export interface GrantGroupAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember | null;
  workspaceId: string;
  onSuccess: () => void;
}

export function GrantGroupAccessDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
  onSuccess,
}: GrantGroupAccessDialogProps) {
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const grantAccess = useGrantGroupAccess(workspaceId);
  const { data: groups } = useGroups({ isActive: true });

  React.useEffect(() => {
    if (member) {
      const currentGroupIds = (member.groupAccess || []).map((ga) => ga.groupId);
      setSelectedGroupIds(currentGroupIds);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    const payload: GrantGroupAccessPayload = {
      groupIds: selectedGroupIds,
    };

    setIsSubmitting(true);
    try {
      await grantAccess(member.id, payload);
      onSuccess();
      handleClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedGroupIds([]);
    onOpenChange(false);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  if (!member) return null;

  const currentGroupIds = (member.groupAccess || []).map((ga) => ga.groupId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Grant Group Access</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Group Access */}
          {currentGroupIds.length > 0 && (
            <div>
              <Label>Current Group Access</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.groupAccess?.map((ga) => (
                  <span
                    key={ga.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                  >
                    {ga.group.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Group Selection */}
          <div>
            <Label>Select Groups</Label>
            <div className="mt-2 max-h-64 overflow-y-auto border border-[var(--groups1-border)] rounded-md p-2 space-y-2">
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
                    <span className="text-sm text-[var(--groups1-text)] flex-1">
                      {group.name}
                    </span>
                    {group.batch && (
                      <span className="text-xs text-[var(--groups1-text-secondary)]">
                        {group.batch.name}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--groups1-text-secondary)]">
              Selected groups will replace current group access. All selected groups will be granted
              to this member.
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
                  Updating...
                </>
              ) : (
                "Update Access"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

