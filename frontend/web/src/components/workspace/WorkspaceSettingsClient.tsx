"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { useGroupStore } from "@/store/group";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Loader2, Trash2 } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Failed to delete workspace";
}

export function WorkspaceSettingsClient() {
  const router = useRouter();
  const workspace = useWorkspaceStore((state) => state.current);
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const clearWorkspace = useWorkspaceStore((state) => state.clear);
  const clearGroup = useGroupStore((state) => state.clear);

  const { data: currentMember, isLoading: isLoadingMember } = useCurrentMember(workspaceId || "");
  const isAdmin = currentMember?.role === "ADMIN";

  const [confirmText, setConfirmText] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const expected = workspace?.name || "";
  const canDelete = !!workspaceId && !!expected && confirmText.trim() === expected;

  if (!workspaceId || !workspace) {
    return (
      <Card variant="groups1">
        <CardContent variant="groups1" className="py-8 text-center text-sm text-[var(--groups1-text-secondary)]">
          No workspace selected.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3">
          <div className="text-sm text-[var(--groups1-text-secondary)]">
            Deleting this workspace will permanently remove all groups, students, calls, call lists, logs, roles, and
            invitations for <span className="font-semibold text-[var(--groups1-text)]">{workspace.name}</span>.
          </div>

          {!isLoadingMember && !isAdmin ? (
            <div className="text-sm text-[var(--groups1-text-secondary)]">Only workspace admins can delete a workspace.</div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setIsDialogOpen(true)}
              disabled={isLoadingMember || isDeleting}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogClose onClose={() => setIsDialogOpen(false)} />
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-[var(--groups1-text-secondary)]">
              Type <span className="font-semibold text-[var(--groups1-text)]">{workspace.name}</span> to confirm. This action
              cannot be undone.
            </div>

            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              placeholder="Workspace name"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!canDelete || isDeleting}
                onClick={async () => {
                  if (!workspaceId) return;
                  setIsDeleting(true);
                  try {
                    await apiClient.deleteWorkspace(workspaceId);
                    toast.success("Workspace deleted");
                    clearGroup();
                    clearWorkspace();
                    router.push("/create-workspace");
                    setIsDialogOpen(false);
                  } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
