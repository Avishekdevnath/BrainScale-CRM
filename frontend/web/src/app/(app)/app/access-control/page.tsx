"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceStore } from "@/store/workspace";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import type { CustomRole, Permission } from "@/types/roles.types";
import { toast } from "sonner";
import { Check, Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function groupPermissions(perms: Permission[]) {
  const byResource: Record<string, Permission[]> = {};
  for (const p of perms) {
    if (!byResource[p.resource]) byResource[p.resource] = [];
    byResource[p.resource].push(p);
  }
  for (const r of Object.keys(byResource)) {
    byResource[r].sort((a, b) => a.action.localeCompare(b.action));
  }
  return Object.entries(byResource).sort((a, b) => a[0].localeCompare(b[0]));
}

function getRolePermissionIds(role: CustomRole | null) {
  return new Set((role?.permissions || []).map((rp) => rp.permission.id));
}

export default function AccessControlPage() {
  const workspaceId = useWorkspaceStore((s) => s.getCurrentId());
  const isAdmin = useIsAdmin();

  const { data: permissions, isLoading: isLoadingPermissions, mutate: mutatePermissions } = useSWR(
    workspaceId ? "permissions" : null,
    () => apiClient.listPermissions(),
    { revalidateOnFocus: false }
  );

  const { data: roles, isLoading: isLoadingRoles, mutate: mutateRoles } = useSWR(
    workspaceId ? `roles-${workspaceId}` : null,
    () => apiClient.listCustomRoles(workspaceId!),
    { revalidateOnFocus: false }
  );

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<CustomRole | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const openCreate = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setSelectedPermissionIds(new Set());
    setEditorOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setSelectedPermissionIds(getRolePermissionIds(role));
    setEditorOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const hasPermissions = (permissions?.length || 0) > 0;

  if (!workspaceId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Access Control</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Select a workspace first.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Access Control</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Only workspace admins can manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Access Control</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Create custom roles and assign permissions. Then assign those roles to members.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
          <Plus className="w-4 h-4 mr-2" />
          New role
        </Button>
      </div>

      <Card variant="groups1">
        <CardHeader variant="groups1" className="flex-row items-center justify-between">
          <CardTitle>Permissions</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isLoadingPermissions}
              onClick={async () => {
                try {
                  await apiClient.initializeDefaultPermissions();
                  toast.success("Permissions initialized");
                  await mutatePermissions();
                } catch (e: any) {
                  toast.error(e?.message || "Failed to initialize permissions");
                }
              }}
            >
              Initialize permissions
            </Button>
            <Button
              variant="outline"
              disabled={isLoadingRoles}
              onClick={async () => {
                try {
                  await apiClient.createDefaultRoles(workspaceId);
                  toast.success("Default roles created/updated");
                  await mutateRoles();
                } catch (e: any) {
                  toast.error(e?.message || "Failed to create default roles");
                }
              }}
            >
              Create default roles
            </Button>
          </div>
        </CardHeader>
        <CardContent variant="groups1" className="text-sm text-[var(--groups1-text-secondary)]">
          {isLoadingPermissions ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading permissions...
            </div>
          ) : hasPermissions ? (
            <div>{permissions!.length} permissions available.</div>
          ) : (
            <div>
              No permissions found in database. Click <span className="font-semibold">Initialize permissions</span>.
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="groups1">
        <CardHeader variant="groups1" className="flex-row items-center justify-between">
          <CardTitle>Custom Roles</CardTitle>
          <div className="text-xs text-[var(--groups1-text-secondary)]">
            Tip: Assign roles on <span className="font-semibold text-[var(--groups1-text)]">Members & Roles</span>.
          </div>
        </CardHeader>
        <CardContent variant="groups1">
          {isLoadingRoles ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
            </div>
          ) : (roles || []).length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--groups1-text-secondary)]">
              No custom roles yet. Create one to manage permissions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(roles || []).map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                        <div className="font-semibold text-[var(--groups1-text)] truncate">{role.name}</div>
                        {role.isSystem ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                            System
                          </span>
                        ) : null}
                      </div>
                      {role.description ? (
                        <div className="text-sm text-[var(--groups1-text-secondary)] mt-1 line-clamp-2">
                          {role.description}
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--groups1-text-secondary)] mt-1">No description</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(role)} disabled={!hasPermissions}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={role.isSystem}
                        onClick={async () => {
                          const ok = window.confirm(`Delete role "${role.name}"?`);
                          if (!ok) return;
                          try {
                            await apiClient.deleteCustomRole(workspaceId, role.id);
                            toast.success("Role deleted");
                            await mutateRoles();
                          } catch (e: any) {
                            toast.error(e?.message || "Failed to delete role");
                          }
                        }}
                        aria-label="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--groups1-text-secondary)]">
                    <div>{role.permissions?.length || 0} permissions</div>
                    <div>{role._count?.members || 0} members</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingRole(null);
            setSaving(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit role" : "Create role"}</DialogTitle>
            <DialogClose onClose={() => setEditorOpen(false)} />
          </DialogHeader>

          {!hasPermissions ? (
            <div className="text-sm text-[var(--groups1-text-secondary)]">
              No permissions found. Click <span className="font-semibold">Initialize permissions</span> first.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[var(--groups1-text)]">Role name</div>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Caller, Manager"
                    disabled={saving || !!editingRole?.isSystem}
                  />
                  {editingRole?.isSystem ? (
                    <div className="text-xs text-[var(--groups1-text-secondary)]">System role name cannot be changed.</div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[var(--groups1-text)]">Description</div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                    className="min-h-[40px]"
                    disabled={saving || !!editingRole?.isSystem}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--groups1-border)]">
                <div className="px-4 py-3 border-b border-[var(--groups1-border)] flex items-center justify-between">
                  <div className="text-sm font-medium text-[var(--groups1-text)]">Permissions</div>
                  <div className="text-xs text-[var(--groups1-text-secondary)]">{selectedPermissionIds.size} selected</div>
                </div>
                <div className="max-h-[55vh] overflow-y-auto p-4 space-y-4">
                  {groupPermissions(permissions || []).map(([resource, perms]) => (
                    <div key={resource} className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)]">
                        {resource}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const checked = selectedPermissionIds.has(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => togglePermission(p.id)}
                              className={cn(
                                "flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                                checked
                                  ? "border-[var(--groups1-primary)] bg-[var(--groups1-secondary)]"
                                  : "border-[var(--groups1-border)] bg-[var(--groups1-surface)] hover:bg-[var(--groups1-secondary)]"
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border",
                                  checked
                                    ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                                    : "border-[var(--groups1-border)] bg-[var(--groups1-background)]"
                                )}
                                aria-hidden="true"
                              >
                                {checked ? <Check className="w-3.5 h-3.5" /> : null}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--groups1-text)]">{p.action}</div>
                                <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                                  {p.description || `${resource}:${p.action}`}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  disabled={saving || !name.trim() || selectedPermissionIds.size === 0}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      let roleId = editingRole?.id;
                      if (!roleId) {
                        const created = await apiClient.createCustomRole(workspaceId, {
                          name: name.trim(),
                          description: description.trim() ? description.trim() : null,
                        });
                        roleId = created.id;
                      } else if (!editingRole?.isSystem) {
                        await apiClient.updateCustomRole(workspaceId, roleId, {
                          name: name.trim(),
                          description: description.trim() ? description.trim() : null,
                        });
                      }

                      await apiClient.assignPermissionsToRole(workspaceId, roleId!, {
                        permissionIds: Array.from(selectedPermissionIds),
                      });

                      toast.success("Role saved");
                      await mutateRoles();
                      setEditorOpen(false);
                    } catch (e: any) {
                      toast.error(e?.message || "Failed to save role");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

