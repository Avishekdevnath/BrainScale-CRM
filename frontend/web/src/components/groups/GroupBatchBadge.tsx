"use client";

import * as React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface GroupBatchBadgeProps {
  batchId?: string | null;
  batchName?: string | null;
  batchIsActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GroupBatchBadge({
  batchId,
  batchName,
  batchIsActive,
  onClick,
  className,
}: GroupBatchBadgeProps) {
  if (!batchId || !batchName) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          "border-[var(--groups1-border)] bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]",
          className
        )}
      >
        No Batch
      </span>
    );
  }

  const content = (
    <StatusBadge
      variant={batchIsActive ? "success" : "warning"}
      size="sm"
      className={cn("cursor-pointer transition-all hover:brightness-95", className)}
      onClick={onClick}
    >
      {batchName}
    </StatusBadge>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link href={`/app/batches/${batchId}`} className="inline-block">
      {content}
    </Link>
  );
}

