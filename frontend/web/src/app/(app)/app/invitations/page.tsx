"use client";

import * as React from "react";
import { InvitationsTable } from "@/components/invitations/InvitationsTable";
import { SendInvitationDialog } from "@/components/invitations/SendInvitationDialog";
import { useInvitations, useCancelInvitation } from "@/hooks/useInvitations";
import { useWorkspaceStore } from "@/store/workspace";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Send, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function InvitationsPage() {
  const workspaceId = useWorkspaceStore((state) => state.getCurrentId());
  const { data: currentMember, isLoading: isLoadingCurrentMember } = useCurrentMember(
    workspaceId || ""
  );
  const { invitations, isLoading, mutate } = useInvitations(workspaceId);
  const cancelInvitation = useCancelInvitation(workspaceId || "");

  const [isSendDialogOpen, setIsSendDialogOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const handleCancel = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      mutate();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCopyLink = (token: string) => {
    // Handled in InvitationsTable component
  };

  const handleSuccess = () => {
    mutate();
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const pending = invitations.filter((inv) => inv.status === "PENDING").length;
    const accepted = invitations.filter((inv) => inv.status === "ACCEPTED").length;
    const expired = invitations.filter((inv) => inv.status === "EXPIRED").length;
    const cancelled = invitations.filter((inv) => inv.status === "CANCELLED").length;

    return {
      pending,
      accepted,
      expired,
      cancelled,
      total: invitations.length,
    };
  }, [invitations]);

  if (!workspaceId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Invitations</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Please select a workspace to view invitations.
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
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Invitations</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            You don't have permission to access this page. Only workspace admins can manage
            invitations.
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
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Invitations</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage workspace invitations and pending requests
          </p>
        </div>
        <Button onClick={() => setIsSendDialogOpen(true)} disabled={isLoading}>
          <Send className="w-4 h-4 mr-2" />
          Send Invitation
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.pending
                  )}
                </p>
              </div>
              <Clock className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Accepted
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.accepted
                  )}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Expired
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.expired
                  )}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>

        <Card variant="groups1">
          <CardContent variant="groups1" className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide">
                  Cancelled
                </p>
                <p className="text-2xl font-bold text-[var(--groups1-text)] mt-1">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stats.cancelled
                  )}
                </p>
              </div>
              <Mail className="w-8 h-8 text-[var(--groups1-text-secondary)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <InvitationsTable
        invitations={invitations}
        onCancel={handleCancel}
        onCopyLink={handleCopyLink}
        isLoading={isLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Send Invitation Dialog */}
      <SendInvitationDialog
        open={isSendDialogOpen}
        onOpenChange={setIsSendDialogOpen}
        workspaceId={workspaceId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
