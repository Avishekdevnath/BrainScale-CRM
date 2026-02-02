"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { useGroupStore } from "@/store/group";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Lock, User, Mail, Bot, Loader2, Download, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  usePageTitle("Settings");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const clearWorkspace = useWorkspaceStore((state) => state.clear);
  const clearGroup = useGroupStore((state) => state.clear);
  const isAdmin = useIsAdmin();
  const { settings, isLoading, isUpdating, updateSettings } = useWorkspaceSettings();
  const [mounted, setMounted] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  // Prevent hydration mismatch - user data comes from localStorage
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleAIFeaturesToggle = async (enabled: boolean) => {
    try {
      await updateSettings({ aiFeaturesEnabled: enabled });
    } catch (err) {
      // Error already handled in hook
    }
  };

  const handleAIFeatureToggle = async (feature: string, enabled: boolean) => {
    if (!settings) return;

    const currentFeatures = Array.isArray(settings.aiFeatures) ? settings.aiFeatures : [];
    const updatedFeatures = enabled
      ? [...currentFeatures, feature].filter((f, i, arr) => arr.indexOf(f) === i) // Add and dedupe
      : currentFeatures.filter((f) => f !== feature);

    try {
      await updateSettings({ aiFeatures: updatedFeatures });
    } catch (err) {
      // Error already handled in hook
    }
  };

  const isFeatureEnabled = (feature: string): boolean => {
    if (!settings?.aiFeaturesEnabled) return false;
    if (!settings.aiFeatures || !Array.isArray(settings.aiFeatures)) return false;
    return settings.aiFeatures.includes(feature);
  };

  const canDelete = (mounted ? (user?.email || "") : "") && confirmText.trim() === "DELETE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Configure your account and preferences
        </p>
      </div>

      {/* Account Information */}
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <div>
              <p 
                className="text-sm font-medium text-[var(--groups1-text)]"
                suppressHydrationWarning
              >
                {mounted ? (user?.name || "No name set") : "No name set"}
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">Name</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <div>
              <p 
                className="text-sm font-medium text-[var(--groups1-text)]"
                suppressHydrationWarning
              >
                {mounted ? (user?.email || "No email") : "No email"}
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">Email</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--groups1-text)]">Password</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Change your account password
                </p>
              </div>
            </div>
            <Link href="/app/settings/change-password">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* AI Features (Admin Only) */}
      {isAdmin && (
        <Card variant="groups1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
              <CardTitle>AI Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            ) : (
              <>
                {/* Master AI Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="ai-features-enabled" className="text-sm font-medium text-[var(--groups1-text)]">
                      Enable AI Features
                    </Label>
                    <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                      Master switch to enable or disable all AI features for this workspace
                    </p>
                  </div>
                  <Switch
                    id="ai-features-enabled"
                    checked={settings?.aiFeaturesEnabled ?? false}
                    onCheckedChange={handleAIFeaturesToggle}
                    disabled={isUpdating}
                  />
                </div>

                {/* Individual AI Features */}
                {settings?.aiFeaturesEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-[var(--groups1-border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="ai-chat" className="text-sm font-medium text-[var(--groups1-text)]">
                          AI Chat
                        </Label>
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                          Enable AI-powered chat assistant for workspace queries
                        </p>
                      </div>
                      <Switch
                        id="ai-chat"
                        checked={isFeatureEnabled("chat")}
                        onCheckedChange={(checked) => handleAIFeatureToggle("chat", checked)}
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="ai-summary" className="text-sm font-medium text-[var(--groups1-text)]">
                          Call Log Summary
                        </Label>
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                          Automatically generate summaries for call logs
                        </p>
                      </div>
                      <Switch
                        id="ai-summary"
                        checked={isFeatureEnabled("summary")}
                        onCheckedChange={(checked) => handleAIFeatureToggle("summary", checked)}
                        disabled={isUpdating}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="ai-sentiment" className="text-sm font-medium text-[var(--groups1-text)]">
                          Sentiment Analysis
                        </Label>
                        <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                          Analyze sentiment of call logs automatically
                        </p>
                      </div>
                      <Switch
                        id="ai-sentiment"
                        checked={isFeatureEnabled("sentiment")}
                        onCheckedChange={(checked) => handleAIFeatureToggle("sentiment", checked)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                )}

                {!settings?.aiFeaturesEnabled && (
                  <p className="text-xs text-[var(--groups1-text-secondary)] italic">
                    Enable AI Features to configure individual features
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Export & Account Deletion */}
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Data & Account</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">Export account data</p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                Download your workspaces data as an XLSX file before deleting your account.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
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
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export XLSX
            </Button>
          </div>

          <div className="border-t border-[var(--groups1-card-border-inner)] pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--groups1-text)]">Delete account</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  This permanently deletes your account and removes you from all workspaces. If you are the last member in
                  a workspace, that workspace will be deleted.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
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
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

