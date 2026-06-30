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
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { FEATURE_LABEL } from "@/lib/platform-features";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Failed to delete workspace";
}

type FeatureField =
  | "callsEnabled"
  | "followupsEnabled"
  | "groupsEnabled"
  | "learningEnabled"
  | "teamChatEnabled"
  | "formsEnabled"
  | "tasksEnabled"
  | "revenueEnabled"
  | "aiFeaturesEnabled";

interface FeatureToggleRow {
  key: string;
  field: FeatureField;
  label: string;
  description: string;
}

const FEATURE_ROWS: FeatureToggleRow[] = [
  { key: "calls", field: "callsEnabled", label: FEATURE_LABEL.calls, description: "My Calls, All Calls, Call Lists, Call Logs" },
  { key: "followups", field: "followupsEnabled", label: FEATURE_LABEL.followups, description: "Follow-up tracking, columns, and reminders" },
  { key: "groups", field: "groupsEnabled", label: FEATURE_LABEL.groups, description: "Group management and group-based filtering" },
  { key: "learning", field: "learningEnabled", label: FEATURE_LABEL.learning, description: "Courses, Modules, Enrollments, and Batches" },
  { key: "forms", field: "formsEnabled", label: FEATURE_LABEL.forms, description: "Form builder and form analytics" },
  { key: "tasks", field: "tasksEnabled", label: FEATURE_LABEL.tasks, description: "Task management, kanban board, and scheduling" },
  { key: "teamChat", field: "teamChatEnabled", label: FEATURE_LABEL.teamChat, description: "Team messaging channels and direct messages" },
  { key: "ai", field: "aiFeaturesEnabled", label: FEATURE_LABEL.ai, description: "AI chat, summaries, and suggestions" },
  { key: "revenue", field: "revenueEnabled", label: FEATURE_LABEL.revenue, description: "Revenue and conversion tracking" },
];

export function WorkspaceSettingsClient() {
  const router = useRouter();
  const workspace = useWorkspaceStore((state) => state.current);
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const clearWorkspace = useWorkspaceStore((state) => state.clear);
  const clearGroup = useGroupStore((state) => state.clear);

  const { isLoading: isLoadingMember } = useCurrentMember(workspaceId || "");
  const isAdmin = useIsAdmin();
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating } = useWorkspaceSettings();

  const [confirmText, setConfirmText] = React.useState("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const expected = workspace?.name || "";
  const canDelete = !!workspaceId && !!expected && confirmText.trim() === expected;

  const handleToggle = async (field: FeatureField, currentValue: boolean) => {
    if (!isAdmin) return;
    await updateSettings({ [field]: !currentValue });
  };

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
      {/* Feature Toggles */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-0 divide-y divide-[var(--groups1-card-border-inner)]">
          {isLoadingSettings ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : (
            <>
              {FEATURE_ROWS.map((row) => {
                const enabled = !!((settings as unknown) as Record<string, unknown>)?.[row.field];
                return (
                  <div key={row.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--groups1-text)]">{row.label}</div>
                      <div className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">{row.description}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={!isAdmin || isUpdating}
                      onClick={() => handleToggle(row.field, enabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:ring-offset-1",
                        enabled
                          ? "bg-[var(--groups1-primary)]"
                          : "bg-[var(--groups1-secondary)]",
                        (!isAdmin || isUpdating) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          enabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                );
              })}
              {!isAdmin && (
                <p className="text-xs text-[var(--groups1-text-secondary)] pt-3">
                  Only workspace admins can change feature settings.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
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
