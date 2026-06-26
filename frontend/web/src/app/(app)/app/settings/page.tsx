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
import { Lock, User, Mail, Bot, Loader2, Download, Trash2, Pencil, X, Check, MessageSquare, Send } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useMyFeedback } from "@/hooks/useFeedback";
import { useFeature } from "@/hooks/usePlatformFeatures";

export default function SettingsPage() {
  usePageTitle("Settings");
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
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

  // Inline edit state for profile
  const [editingField, setEditingField] = React.useState<"name" | "email" | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Platform feature availability (platform OFF beats workspace)
  const aiFeature = useFeature("ai");
  const tasksFeature = useFeature("tasks");
  const revenueFeature = useFeature("revenue");

  // Feedback form state
  const [fbMessage, setFbMessage] = React.useState("");
  const [fbType, setFbType] = React.useState<"BUG" | "ISSUE" | "SUGGESTION" | "OTHER">("OTHER");
  const [fbSubmitting, setFbSubmitting] = React.useState(false);
  const { data: myFeedback, mutate: mutateFeedback } = useMyFeedback();

  const submitFeedback = async () => {
    const msg = fbMessage.trim();
    if (msg.length < 10) { toast.error("Message must be at least 10 characters"); return; }
    setFbSubmitting(true);
    try {
      await apiClient.submitFeedback({ message: msg, type: fbType });
      toast.success("Feedback submitted — thank you!");
      setFbMessage("");
      setFbType("OTHER");
      mutateFeedback();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit feedback");
    } finally {
      setFbSubmitting(false);
    }
  };

  // Fetch fresh user data from server
  const { data: serverUser, mutate: mutateUser } = useSWR(
    authUser ? "current-user-profile" : null,
    () => apiClient.getMe(),
    { revalidateOnFocus: false }
  );

  // Resolved user: server data takes priority over localStorage
  const user = serverUser ?? authUser;

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const startEdit = (field: "name" | "email") => {
    setEditingField(field);
    setEditValue(field === "name" ? (user?.name ?? "") : (user?.email ?? ""));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingField || !user) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (trimmed === (editingField === "name" ? user.name : user.email)) {
      cancelEdit();
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await apiClient.updateMyProfile({ [editingField]: trimmed });
      setAuthUser({ id: updated.id, name: updated.name, email: updated.email });
      await mutateUser();
      toast.success("Profile updated");
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      <Card variant="groups1" className="gap-1">
        <CardHeader className="gap-1 pb-1 pt-2">
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3 pt-1">
          {/* Name row */}
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 flex-shrink-0 text-[var(--groups1-text-secondary)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--groups1-text-secondary)] mb-0.5">Name</p>
              {mounted && editingField === "name" ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    disabled={isSavingProfile}
                    className="flex-1 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-2 py-1 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)] disabled:opacity-60"
                  />
                  <button onClick={saveEdit} disabled={isSavingProfile} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={cancelEdit} disabled={isSavingProfile} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm font-medium text-[var(--groups1-text)]" suppressHydrationWarning>
                    {mounted ? (user?.name || <span className="text-[var(--groups1-text-secondary)] italic">No name set</span>) : "…"}
                  </p>
                  {mounted && (
                    <button onClick={() => startEdit("name")} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email row */}
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 flex-shrink-0 text-[var(--groups1-text-secondary)]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--groups1-text-secondary)] mb-0.5">Email</p>
              {mounted && editingField === "email" ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                    disabled={isSavingProfile}
                    className="flex-1 rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-2 py-1 text-sm text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)] disabled:opacity-60"
                  />
                  <button onClick={saveEdit} disabled={isSavingProfile} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={cancelEdit} disabled={isSavingProfile} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm font-medium text-[var(--groups1-text)]" suppressHydrationWarning>
                    {mounted ? (user?.email || <span className="text-[var(--groups1-text-secondary)] italic">No email</span>) : "…"}
                  </p>
                  {mounted && (
                    <button onClick={() => startEdit("email")} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="groups1" className="gap-1">
        <CardHeader className="gap-1 pb-1 pt-2">
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4 pt-1">
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

      {/* Feedback */}
      <Card variant="groups1" className="gap-1">
        <CardHeader className="gap-1 pb-1 pt-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <CardTitle>Feedback</CardTitle>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4 pt-1">
          {/* Submit form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {(["BUG", "ISSUE", "SUGGESTION", "OTHER"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFbType(t)}
                  className={`text-xs px-2.5 py-1 rounded-lg border ${
                    fbType === t
                      ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]"
                      : "border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <textarea
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              rows={3}
              placeholder="Describe a bug, issue, or suggestion (min 10 characters)…"
              className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-sm text-[var(--groups1-text)] outline-none resize-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={fbSubmitting || fbMessage.trim().length < 10}
                onClick={submitFeedback}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {fbSubmitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>

          {/* History */}
          {myFeedback && myFeedback.length > 0 && (
            <div className="space-y-3 border-t border-[var(--groups1-card-border-inner)] pt-3">
              <p className="text-xs font-medium text-[var(--groups1-text-secondary)]">Your submissions</p>
              {myFeedback.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg border border-[var(--groups1-border)]">{f.type}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg border ${
                        f.status === "OPEN"
                          ? "border-blue-500/40 text-blue-500"
                          : "border-emerald-500/40 text-emerald-600"
                      }`}
                    >
                      {f.status === "OPEN" ? "Open" : "Resolved"}
                    </span>
                    <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[var(--groups1-text)]">{f.message}</p>
                  {f.reply && (
                    <div className="ml-3 pl-3 border-l-2 border-[var(--groups1-primary)]/40 space-y-0.5">
                      <p className="text-xs text-[var(--groups1-text-secondary)]">
                        Reply from BrainScale{f.repliedAt ? ` · ${new Date(f.repliedAt).toLocaleDateString()}` : ""}
                      </p>
                      <p className="text-sm text-[var(--groups1-text)]">{f.reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules (Admin Only) — Tasks & Revenue feature toggles */}
      {isAdmin && (
        <Card variant="groups1" className="gap-1">
          <CardHeader className="gap-1 pb-1 pt-2">
            <CardTitle>Modules</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-3 pt-1">
            {([
              ["tasks", "Tasks", tasksFeature, settings?.tasksEnabled] as const,
              ["revenue", "Revenue Tracking", revenueFeature, settings?.revenueEnabled] as const,
            ]).map(([key, label, feat, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[var(--groups1-text)]">{label}</Label>
                {feat.disabledBy === "platform" ? (
                  <span className="text-xs px-2 py-0.5 rounded-lg border border-red-500/40 text-red-500">
                    Disabled by platform
                  </span>
                ) : (
                  <Switch
                    checked={value ?? true}
                    disabled={isUpdating}
                    onCheckedChange={(checked) => updateSettings({ [key + "Enabled"]: checked } as any)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Features (Admin Only) */}
      {isAdmin && (
        <Card variant="groups1" className="gap-1">
          <CardHeader className="gap-1 pb-1 pt-2">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
              <CardTitle>AI Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-2 pt-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            ) : (
              <>
                {/* Master AI Toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="ai-features-enabled" className="text-sm font-medium text-[var(--groups1-text)]">
                      Enable AI Features
                    </Label>
                    <p className="mt-0 text-xs leading-4 text-[var(--groups1-text-secondary)]">
                      Master switch to enable or disable all AI features for this workspace
                    </p>
                  </div>
                  {aiFeature.disabledBy === "platform" ? (
                    <span className="text-xs px-2 py-0.5 rounded-lg border border-red-500/40 text-red-500">
                      Disabled by platform
                    </span>
                  ) : (
                    <Switch
                      id="ai-features-enabled"
                      checked={settings?.aiFeaturesEnabled ?? false}
                      onCheckedChange={handleAIFeaturesToggle}
                      disabled={isUpdating}
                    />
                  )}
                </div>

                {/* Individual AI Features */}
                {settings?.aiFeaturesEnabled && (
                  <div className="space-y-3 border-l-2 border-[var(--groups1-border)] pl-4 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="ai-chat" className="text-sm font-medium text-[var(--groups1-text)]">
                          AI Chat
                        </Label>
                        <p className="mt-0.5 text-xs text-[var(--groups1-text-secondary)]">
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
                        <p className="mt-0.5 text-xs text-[var(--groups1-text-secondary)]">
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
                        <p className="mt-0.5 text-xs text-[var(--groups1-text-secondary)]">
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
                  <p className="mt-0 text-xs italic leading-4 text-[var(--groups1-text-secondary)]">
                    Enable AI Features to configure individual features
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Export & Account Deletion */}
      <Card variant="groups1" className="gap-1">
        <CardHeader className="gap-1 pb-1 pt-2">
          <CardTitle>Data & Account</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4 pt-1">
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

