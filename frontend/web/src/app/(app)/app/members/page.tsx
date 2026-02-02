"use client";

import * as React from "react";
import { MembersTable } from "@/components/members/MembersTable";
import { InviteMemberDialog } from "@/components/members/InviteMemberDialog";
import { UpdateMemberRoleDialog } from "@/components/members/UpdateMemberRoleDialog";
import { GrantGroupAccessDialog } from "@/components/members/GrantGroupAccessDialog";
import { RemoveMemberDialog } from "@/components/members/RemoveMemberDialog";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useWorkspaceStore } from "@/store/workspace";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, formatMemberName, getRoleLabel } from "@/lib/member-utils";
import { UserPlus, Users, Shield, User, Search, Mail, Calendar, Key, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function MembersPage() {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember, isLoading: isLoadingCurrentMember } = useCurrentMember(
    workspaceId || ""
  );
  const { members, isLoading, mutate } = useWorkspaceMembers(workspaceId);
  const [mobileSearch, setMobileSearch] = React.useState("");

  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
  const [actionType, setActionType] = React.useState<
    "updateRole" | "grantAccess" | "remove" | null
  >(null);

  const selectedMember = React.useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  const handleUpdateRole = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActionType("updateRole");
  };

  const handleGrantAccess = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActionType("grantAccess");
  };

  const handleRemove = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActionType("remove");
  };

  const handleDialogClose = () => {
    setSelectedMemberId(null);
    setActionType(null);
  };

  const handleSuccess = () => {
    mutate();
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "ADMIN").length;
    const regularMembers = members.filter((m) => m.role === "MEMBER" && !m.customRoleId).length;
    const customRoleMembers = members.filter((m) => m.customRoleId).length;

    return {
      total,
      admins,
      members: regularMembers,
      customRole: customRoleMembers,
    };
  }, [members]);

  const filteredMembersMobile = React.useMemo(() => {
    if (!mobileSearch.trim()) return members;
    const term = mobileSearch.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.user.name?.toLowerCase().includes(term) ||
        m.user.email.toLowerCase().includes(term)
    );
  }, [members, mobileSearch]);

  if (!workspaceId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Members & Roles</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Please select a workspace to view members.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  // Note: customRoleId check would require fetching custom role details
  // For now, just check if role is ADMIN
  const isAdmin = currentMember?.role === "ADMIN";

  if (!isLoadingCurrentMember && !isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Members & Roles</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            You don't have permission to access this page. Only workspace admins can manage
            members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-4 md:space-y-6 pb-24 md:pb-0">
      {/* Header (Mobile) */}
      <div className="md:hidden px-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] leading-tight">Members & Roles</h1>
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
              Manage workspace members and their roles.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsInviteDialogOpen(true)}
          disabled={isLoading}
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Header (Desktop) */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Members & Roles</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage workspace members and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsInviteDialogOpen(true)}
            disabled={isLoading}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Total Members
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.total
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Admins
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.admins
                  )}
                </p>
              </div>
              <Shield className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Members
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.members
                  )}
                </p>
              </div>
              <User className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Custom Roles
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.customRole
                  )}
                </p>
              </div>
              <Shield className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members (Mobile cards) */}
      <div className="md:hidden">
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-0">
            <div className="p-4 border-b border-[var(--groups1-card-border-inner)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]"
                  )}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            ) : filteredMembersMobile.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--groups1-text-secondary)]">
                No members found.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredMembersMobile.map((m) => {
                  const isYou = currentMember?.userId === m.userId;
                  const groupAccess = m.groupAccess || [];
                  const visibleGroups = groupAccess.slice(0, 2);
                  const remainingGroups = groupAccess.length - visibleGroups.length;
                  const roleLabel = m.customRole?.name ? m.customRole.name : getRoleLabel(m.role);

                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-base font-semibold text-[var(--groups1-text)] truncate">
                                {formatMemberName(m)}
                              </div>
                              {isYou ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{m.user.email}</span>
                            </div>
                          </div>
                          <StatusBadge
                            variant={m.role === "ADMIN" ? "success" : "info"}
                            size="sm"
                          >
                            {roleLabel}
                          </StatusBadge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                              Group Access
                            </div>
                            {groupAccess.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {visibleGroups.map((ga) => (
                                  <span
                                    key={ga.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                                  >
                                    {ga.group.name}
                                  </span>
                                ))}
                                {remainingGroups > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                                    +{remainingGroups}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--groups1-text-secondary)]">-</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                              Joined
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--groups1-text)]">
                              <Calendar className="w-3.5 h-3.5 text-[var(--groups1-text-secondary)]" />
                              {formatDate(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--groups1-background)] border-t border-[var(--groups1-border)] px-4 py-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          disabled={isYou}
                          onClick={() => handleUpdateRole(m.id)}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Update Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          disabled={isYou}
                          onClick={() => handleGrantAccess(m.id)}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Access
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-10 p-0 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={isYou}
                          onClick={() => handleRemove(m.id)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members (Desktop table) */}
      <div className="hidden md:block">
        <MembersTable
          members={members}
          onUpdateRole={handleUpdateRole}
          onGrantAccess={handleGrantAccess}
          onRemove={handleRemove}
          isLoading={isLoading}
          currentUserId={currentMember?.userId}
        />
      </div>

      {/* Dialogs */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <UpdateMemberRoleDialog
        open={actionType === "updateRole"}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
        member={selectedMember}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
        allMembers={members}
      />

      <GrantGroupAccessDialog
        open={actionType === "grantAccess"}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
        member={selectedMember}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <RemoveMemberDialog
        open={actionType === "remove"}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
        member={selectedMember}
        workspaceId={workspaceId}
        currentUserId={currentMember?.userId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
