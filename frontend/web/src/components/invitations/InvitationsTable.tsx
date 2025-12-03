"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Invitation } from "@/types/members.types";
import { getStatusLabel, getStatusColor, formatInvitationExpiry } from "@/lib/member-utils";
import { Mail, Calendar, User, X, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface InvitationsTableProps {
  invitations: Invitation[];
  onCancel: (invitationId: string) => void;
  onCopyLink: (token: string) => void;
  isLoading?: boolean;
  statusFilter?: string | null;
  onStatusFilterChange?: (status: string | null) => void;
}

export function InvitationsTable({
  invitations,
  onCancel,
  onCopyLink,
  isLoading = false,
  statusFilter,
  onStatusFilterChange,
}: InvitationsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredInvitations = React.useMemo(() => {
    let filtered = invitations;

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((inv) => inv.email.toLowerCase().includes(term));
    }

    return filtered;
  }, [invitations, statusFilter, searchTerm]);

  const handleCopyLink = (token: string) => {
    // Construct invite URL - adjust based on your app's routing
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${baseUrl}/invite?token=${token}`;
    
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success("Invitation link copied to clipboard");
      onCopyLink(token);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  if (isLoading) {
    return (
      <Card variant="groups1">
        <CardContent variant="groups1" className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card variant="groups1">
        <CardContent variant="groups1" className="py-12">
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-[var(--groups1-text-secondary)]" />
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              No invitations found. Send an invitation to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="groups1">
      <CardContent variant="groups1" className="p-0">
        {/* Filters */}
        <div className="p-4 border-b border-[var(--groups1-card-border-inner)] space-y-3">
          <input
            type="text"
            placeholder="Search invitations by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--groups1-background)] border border-[var(--groups1-border)] rounded-md text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
          />
          {onStatusFilterChange && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusFilterChange(null)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  !statusFilter
                    ? "bg-[var(--groups1-primary)] text-white"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => onStatusFilterChange("PENDING")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  statusFilter === "PENDING"
                    ? "bg-[var(--groups1-primary)] text-white"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => onStatusFilterChange("ACCEPTED")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  statusFilter === "ACCEPTED"
                    ? "bg-[var(--groups1-primary)] text-white"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Accepted
              </button>
              <button
                onClick={() => onStatusFilterChange("EXPIRED")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  statusFilter === "EXPIRED"
                    ? "bg-[var(--groups1-primary)] text-white"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => onStatusFilterChange("CANCELLED")}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  statusFilter === "CANCELLED"
                    ? "bg-[var(--groups1-primary)] text-white"
                    : "bg-[var(--groups1-secondary)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                }`}
              >
                Cancelled
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--groups1-card-border-inner)] bg-[var(--groups1-surface)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Custom Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Invited By
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--groups1-text-secondary)]">
                    No invitations found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => {
                  const statusColor = getStatusColor(invitation.status);
                  const isPending = invitation.status === "PENDING";

                  return (
                    <tr
                      key={invitation.id}
                      className="border-b border-[var(--groups1-card-border-inner)] hover:bg-[var(--groups1-surface)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          <span className="text-sm font-medium text-[var(--groups1-text)]">
                            {invitation.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={invitation.role === "ADMIN" ? "success" : "info"}
                          size="sm"
                        >
                          {invitation.role}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {invitation.customRole ? (
                          <span className="text-sm text-[var(--groups1-text)]">
                            {invitation.customRole.name}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={
                            invitation.status === "PENDING"
                              ? "info"
                              : invitation.status === "ACCEPTED"
                              ? "success"
                              : invitation.status === "EXPIRED"
                              ? "error"
                              : "warning"
                          }
                          size="sm"
                        >
                          {getStatusLabel(invitation.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                          <Calendar className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          {formatInvitationExpiry(invitation)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                          <User className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          <span className="text-[var(--groups1-text-secondary)]">Unknown</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(invitation.token)}
                                className="h-8"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCancel(invitation.id)}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

