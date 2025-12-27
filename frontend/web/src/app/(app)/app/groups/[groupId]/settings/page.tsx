"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { useGroupInitializer } from "@/hooks/useGroupInitializer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { mutate } from "swr";
import { BatchSelector } from "@/components/batches/BatchSelector";

function GroupSettingsPageContent() {
  const params = useParams();
  const groupId = params?.groupId as string;
  const isAdmin = useIsAdmin();
  const { isLoading: isInitializing } = useGroupInitializer();
  const { data: group, error: groupError, isLoading: groupLoading, mutate: mutateGroup } = useGroup(groupId);

  const groupName = group?.name || `Group ${groupId}`;
  usePageTitle(group ? `${groupName} - Settings` : "Group Settings");

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    batchId: null as string | null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when group loads
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        isActive: group.isActive,
        batchId: group.batchId || null,
      });
      setHasChanges(false);
    }
  }, [group]);

  // Track changes
  useEffect(() => {
    if (group) {
      const hasNameChange = formData.name !== group.name;
      const hasActiveChange = formData.isActive !== group.isActive;
      const hasBatchChange = formData.batchId !== (group.batchId || null);
      setHasChanges(hasNameChange || hasActiveChange || hasBatchChange);
    }
  }, [formData, group]);

  const handleSave = async () => {
    if (!group || !hasChanges) return;

    // Validate name
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateGroup(groupId, {
        name: formData.name.trim(),
        isActive: formData.isActive,
        batchId: formData.batchId,
      });
      toast.success("Group settings updated successfully");
      await mutateGroup();
      await mutate("groups");
      setHasChanges(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update group settings";
      
      if (error?.status === 403) {
        toast.error("Admin access required");
      } else if (error?.status === 404) {
        toast.error("Group not found");
      } else if (error?.status === 409) {
        toast.error("A group with this name already exists");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (group) {
      setFormData({
        name: group.name,
        isActive: group.isActive,
        batchId: group.batchId || null,
      });
      setHasChanges(false);
    }
  };

  // Loading state
  if (isInitializing || groupLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Settings
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            {isInitializing ? "Initializing group..." : "Loading settings..."}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
        </div>
      </div>
    );
  }

  // Error state
  if (groupError) {
    const errorMessage = groupError instanceof Error ? groupError.message : "Failed to load group settings";
    const isNotFound = (groupError as any)?.status === 404;
    const isForbidden = (groupError as any)?.status === 403;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Settings
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              {isNotFound ? "Group Not Found" : isForbidden ? "Access Denied" : "Error Loading Settings"}
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              {isNotFound
                ? "The group you're looking for doesn't exist or has been deleted."
                : isForbidden
                ? "You don't have permission to access this group."
                : errorMessage}
            </p>
            <Button
              onClick={() => mutateGroup()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Settings
          </h1>
        </div>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-[var(--groups1-error)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Only administrators can access group settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
            {groupName} - Settings
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage group settings and preferences
          </p>
        </div>
      </div>

      {/* General Settings */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-[var(--groups1-text)]">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              disabled={isSaving}
            />
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              The name must be unique within your workspace and at least 2 characters long.
            </p>
          </div>

          {/* Active Status */}
          <div className="space-y-2">
            <Label htmlFor="isActive" className="text-sm font-medium text-[var(--groups1-text)]">
              Status
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--groups1-border)] text-[var(--groups1-primary)] focus:ring-2 focus:ring-[var(--groups1-primary)] focus:ring-offset-0 cursor-pointer"
                disabled={isSaving}
              />
              <label
                htmlFor="isActive"
                className="text-sm text-[var(--groups1-text)] cursor-pointer"
              >
                Active
              </label>
            </div>
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Inactive groups are hidden from most views but retain all data.
            </p>
          </div>

          {/* Batch Association */}
          <div className="space-y-2">
            <Label htmlFor="batchId" className="text-sm font-medium text-[var(--groups1-text)]">
              Batch
            </Label>
            <BatchSelector
              value={formData.batchId}
              onChange={(value) =>
                setFormData({ ...formData, batchId: typeof value === "string" ? value : value?.[0] || null })
              }
              placeholder="No Batch (Standalone Group)"
              allowClear={true}
              isActiveOnly={true}
              className="w-full"
            />
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Associate this group with a batch for easier management and reporting.
            </p>
          </div>

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--groups1-border)]">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                onClick={handleReset}
                disabled={isSaving}
                variant="outline"
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GroupSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Group Settings</h1>
          <Card variant="groups1">
            <CardContent variant="groups1" className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <GroupSettingsPageContent />
    </Suspense>
  );
}

