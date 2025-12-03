"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CallListCardProps {
  callList: {
    id: string;
    name: string;
    groupId: string | null;
    group: {
      id: string;
      name: string;
      batch: {
        id: string;
        name: string;
      } | null;
    } | null;
    itemCount: number;
    source: string;
    createdAt: string;
    updatedAt: string;
  };
  onEdit?: (callListId: string) => void;
  onDelete?: (callListId: string) => void;
  isAdmin?: boolean;
}

export function CallListCard({
  callList,
  onEdit,
  onDelete,
  isAdmin = false,
}: CallListCardProps) {
  const router = useRouter();

  return (
    <Card variant="groups1" className="hover:shadow-md transition-shadow">
      <CardContent variant="groups1" className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/app/call-lists/${callList.id}`}
                className="text-base font-semibold text-[var(--groups1-text)] hover:underline"
              >
                {callList.name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {callList.group ? (
                <>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--groups1-primary)] bg-opacity-10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)] border-opacity-20">
                    {callList.group.name}
                  </span>
                  {callList.group.batch && (
                    <span className="text-xs text-[var(--groups1-text-secondary)]">
                      • {callList.group.batch.name}
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                  Workspace-wide
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-[var(--groups1-text-secondary)]">
              <span>{callList.itemCount} {callList.itemCount === 1 ? "student" : "students"}</span>
              <span>•</span>
              <span>{new Date(callList.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="capitalize">{callList.source.toLowerCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(`/app/call-lists/${callList.id}`)}
              aria-label="View call list"
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            {isAdmin && (
              <>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(callList.id)}
                    aria-label="Edit call list"
                    className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(callList.id)}
                    aria-label="Delete call list"
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

