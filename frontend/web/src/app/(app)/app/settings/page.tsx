"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Lock, User, Mail, Bot, Loader2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SettingsPage() {
  usePageTitle("Settings");
  const user = useAuthStore((state) => state.user);
  const isAdmin = useIsAdmin();
  const { settings, isLoading, isUpdating, updateSettings } = useWorkspaceSettings();
  const [mounted, setMounted] = React.useState(false);

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
    </div>
  );
}

