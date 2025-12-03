"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loader2, Phone, Eye } from "lucide-react";
import Link from "next/link";
import type { Followup } from "@/types/followups.types";

export interface FollowupsTableProps {
  followups: Followup[];
  isLoading: boolean;
  onMakeCall: (followupId: string) => void;
  onViewDetails?: (followup: Followup) => void;
}

export function FollowupsTable({
  followups,
  isLoading,
  onMakeCall,
  onViewDetails,
}: FollowupsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  if (followups.length === 0) {
    return (
      <div className="py-8 text-center border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
        <p className="text-sm text-[var(--groups1-text-secondary)]">No follow-ups found.</p>
      </div>
    );
  }

  const getStatusVariant = (status: string, isOverdue: boolean) => {
    if (isOverdue && status === "PENDING") return "error";
    if (status === "DONE") return "success";
    if (status === "SKIPPED") return "warning";
    return "info";
  };

  return (
    <div className="border border-[var(--groups1-border)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--groups1-border)]">
          <thead className="bg-[var(--groups1-secondary)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Call List
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Previous Call
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Assignee
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--groups1-background)] divide-y divide-[var(--groups1-border)]">
            {followups.map((followup) => (
              <tr key={followup.id} className="hover:bg-[var(--groups1-secondary)]">
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/app/students/${followup.studentId}`}
                    className="font-medium text-[var(--groups1-primary)] hover:underline"
                  >
                    {followup.student?.name || "Unknown"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                  {followup.group ? (
                    <Link
                      href={`/app/groups/${followup.groupId}`}
                      className="text-[var(--groups1-primary)] hover:underline"
                    >
                      {followup.group.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                  {followup.callList ? (
                    <Link
                      href={`/app/call-lists/${followup.callListId}`}
                      className="text-[var(--groups1-primary)] hover:underline"
                    >
                      {followup.callList.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)]">
                  {followup.previousCallLog
                    ? new Date(followup.previousCallLog.callDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={
                      followup.isOverdue && followup.status === "PENDING"
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : "text-[var(--groups1-text-secondary)]"
                    }
                  >
                    {new Date(followup.dueAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge
                    variant={getStatusVariant(followup.status, followup.isOverdue)}
                    size="sm"
                  >
                    {followup.status}
                    {followup.isOverdue && followup.status === "PENDING" && " (Overdue)"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--groups1-text)]">
                  {followup.assignee?.user.name || "-"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {followup.status === "PENDING" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onMakeCall(followup.id)}
                        className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Make Call
                      </Button>
                    )}
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(followup)}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

