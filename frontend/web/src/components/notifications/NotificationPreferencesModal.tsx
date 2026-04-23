"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { useWorkspaceStore } from "@/store/workspace";
import { apiClient } from "@/lib/api-client";
import { PREFERENCE_ROWS } from "@/lib/notification-registry";

interface NotificationPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesModal({
  open,
  onOpenChange,
}: NotificationPreferencesModalProps) {
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const { data: prefs, isLoading } = useNotificationPreferences();
  const [saving, setSaving] = useState(false);

  const [local, setLocal] = useState<Record<string, boolean> | null>(null);

  // Build server values from registry defaults + fetched prefs
  const serverValues: Record<string, boolean> = Object.fromEntries(
    PREFERENCE_ROWS.map((row) => [
      row.key,
      (prefs as unknown as Record<string, unknown>)?.[row.key] !== undefined
        ? Boolean((prefs as unknown as Record<string, unknown>)[row.key])
        : row.defaultValue,
    ])
  );

  // Use local state if user has interacted, otherwise use server data
  const values: Record<string, boolean> = local ?? serverValues;

  const toggle = (key: string) => {
    setLocal((prev) => ({
      ...(prev ?? values),
      [key]: !(prev ?? values)[key],
    }));
  };

  const handleSave = async () => {
    if (!local) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await apiClient.updateNotificationPreferences(local);
      if (workspaceId) {
        await mutate(`${workspaceId}:notification-preferences`);
      }
      toast.success("Preferences saved");
      setLocal(null);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Notification Preferences
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-2">
            {PREFERENCE_ROWS.map((row) => (
              <div
                key={row.key}
                className="h-12 bg-[var(--groups1-secondary)] rounded animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {PREFERENCE_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 py-3 border-b border-[var(--groups1-border)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--groups1-text)]">
                    {row.label}
                  </p>
                  <p className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">
                    {row.description}
                  </p>
                </div>
                <Switch
                  checked={values[row.key] ?? row.defaultValue}
                  onCheckedChange={() => toggle(row.key)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocal(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || isLoading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
