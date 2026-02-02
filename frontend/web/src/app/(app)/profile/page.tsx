"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { useGroupStore } from "@/store/group";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Download, Loader2, LogOut, Plus, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clear);
  const clearWorkspace = useWorkspaceStore((s) => s.clear);
  const clearGroup = useGroupStore((s) => s.clear);

  const [mounted, setMounted] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    if (!accessToken) router.replace("/login");
  }, [mounted, accessToken, router]);

  const { data: me, isLoading: isLoadingMe } = useSWR(
    mounted && accessToken ? "auth-me" : null,
    () => apiClient.getMe(),
    { revalidateOnFocus: false }
  );

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useSWR(
    mounted && accessToken ? "workspaces" : null,
    () => apiClient.getWorkspaces(),
    { revalidateOnFocus: false }
  );

  const hasWorkspace = !!workspaces?.length;
  const canDelete = confirmText.trim() === "DELETE";

  // Prevent hydration mismatch: server render can't see localStorage-backed auth state.
  if (!mounted) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Profile</h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">Your account (not tied to any workspace)</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--groups1-text-secondary)]">Name</span>
              <span className="text-[var(--groups1-text)]">…</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--groups1-text-secondary)]">Email</span>
              <span className="text-[var(--groups1-text)]">…</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Profile</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Your account (not tied to any workspace)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearGroup();
              clearWorkspace();
              clearAuth();
              router.replace("/logout");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--groups1-text-secondary)]">Name</span>
            <span className="text-[var(--groups1-text)]" suppressHydrationWarning>
              {isLoadingMe ? "…" : me?.name || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[var(--groups1-text-secondary)]">Email</span>
            <span className="text-[var(--groups1-text)]" suppressHydrationWarning>
              {isLoadingMe ? "…" : me?.email || "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3">
          {isLoadingWorkspaces ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : !hasWorkspace ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                You don’t have any workspace yet. Create one to access the dashboard.
              </p>
              <Link href="/create-workspace">
                <Button className="w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                Select a workspace from the topbar/side menu, or go to dashboard.
              </div>
              <Link href="/app">
                <Button className="w-full md:w-auto">Go to Dashboard</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Data & Delete</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3">
          <Button
            variant="outline"
            disabled={isExporting}
            onClick={async () => {
              setIsExporting(true);
              try {
                const blob = await apiClient.exportMyAccountXlsx();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const date = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `brainscale-account-export-${date}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast.success("Export downloaded");
              } catch (err: any) {
                toast.error(err?.message || "Failed to export data");
              } finally {
                setIsExporting(false);
              }
            }}
            className="w-full md:w-auto"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export XLSX
          </Button>

          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full md:w-auto"
          >
            Delete Account
          </Button>

          <div className="text-xs text-[var(--groups1-text-secondary)]">
            Deleting your account removes you from all workspaces. If you are the last member in a workspace, it will be
            deleted automatically.
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-[var(--groups1-text-secondary)]">
              Type <span className="font-semibold text-[var(--groups1-text)]">DELETE</span> to confirm. This action cannot be
              undone.
            </div>

            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              placeholder="Type DELETE"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!canDelete || isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const result = await apiClient.deleteMyAccount();
                    toast.success(result.message || "Account deleted");
                    clearGroup();
                    clearWorkspace();
                    clearAuth();
                    router.replace("/logout");
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to delete account");
                  } finally {
                    setIsDeleting(false);
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-xs text-[var(--groups1-text-secondary)]">
        Tip: If you just deleted a workspace, use <Link className="underline" href="/create-workspace">Create Workspace</Link>{" "}
        to start again.
      </div>
    </div>
  );
}
