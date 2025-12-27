"use client";

import * as React from "react";
import { MembersTable } from "@/components/members/MembersTable";
import { InviteMemberDialog } from "@/components/members/InviteMemberDialog";
import { CreateMemberDialog } from "@/components/members/CreateMemberDialog";
import { UpdateMemberRoleDialog } from "@/components/members/UpdateMemberRoleDialog";
import { GrantGroupAccessDialog } from "@/components/members/GrantGroupAccessDialog";
import { RemoveMemberDialog } from "@/components/members/RemoveMemberDialog";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useWorkspaceStore } from "@/store/workspace";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Users, Shield, User } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function MembersPage() {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember, isLoading: isLoadingCurrentMember } = useCurrentMember(
    workspaceId || ""
  );
  const { members, isLoading, mutate } = useWorkspaceMembers(workspaceId);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isLoading}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create Member
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Members Table */}
      <MembersTable
        members={members}
        onUpdateRole={handleUpdateRole}
        onGrantAccess={handleGrantAccess}
        onRemove={handleRemove}
        isLoading={isLoading}
        currentUserId={currentMember?.userId}
      />

      {/* Dialogs */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />

      <CreateMemberDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
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
