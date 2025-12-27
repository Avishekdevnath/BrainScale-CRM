"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WorkspaceMember } from "@/types/members.types";
import { formatMemberName, getRoleLabel, formatDate } from "@/lib/member-utils";
import { MoreVertical, User, Mail, Calendar, Shield, Users } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Loader2 } from "lucide-react";

export interface MembersTableProps {
  members: WorkspaceMember[];
  onUpdateRole: (memberId: string) => void;
  onGrantAccess: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  isLoading?: boolean;
  currentUserId?: string;
}

export function MembersTable({
  members,
  onUpdateRole,
  onGrantAccess,
  onRemove,
  isLoading = false,
  currentUserId,
}: MembersTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredMembers = React.useMemo(() => {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (member) =>
        member.user.name?.toLowerCase().includes(term) ||
        member.user.email.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

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

  if (members.length === 0) {
    return (
      <Card variant="groups1">
        <CardContent variant="groups1" className="py-12">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-[var(--groups1-text-secondary)]" />
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              No members found. Invite members to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="groups1">
      <CardContent variant="groups1" className="p-0">
        {/* Search */}
        <div className="p-4 border-b border-[var(--groups1-card-border-inner)]">
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--groups1-background)] border border-[var(--groups1-border)] rounded-md text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-primary)]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--groups1-card-border-inner)] bg-[var(--groups1-surface)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Group Access
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--groups1-text-secondary)]">
                    No members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentUser = currentUserId === member.userId;
                  const groupAccess = member.groupAccess || [];
                  const visibleGroups = groupAccess.slice(0, 3);
                  const remainingGroups = groupAccess.length - 3;

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-[var(--groups1-card-border-inner)] hover:bg-[var(--groups1-surface)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center">
                            <User className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--groups1-text)]">
                            {formatMemberName(member)}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-[var(--groups1-text-secondary)]">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                          <Mail className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          {member.user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={member.role === "ADMIN" ? "success" : "info"}
                          size="sm"
                        >
                          {getRoleLabel(member.role)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {groupAccess.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {visibleGroups.map((ga) => (
                              <span
                                key={ga.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                              >
                                {ga.group.name}
                              </span>
                            ))}
                            {remainingGroups > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                                +{remainingGroups} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--groups1-text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
                          <Calendar className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                          {formatDate(member.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={isCurrentUser}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="z-50 min-w-[160px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg"
                              align="end"
                            >
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                                onSelect={() => onUpdateRole(member.id)}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Update Role
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                                onSelect={() => onGrantAccess(member.id)}
                              >
                                <Users className="w-4 h-4 mr-2" />
                                Grant Group Access
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                onSelect={() => onRemove(member.id)}
                                disabled={isCurrentUser}
                              >
                                Remove Member
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
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

