"use client";

import * as React from "react";
import { RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ManagementPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
}

export function ManagementPageHeader({
  icon: Icon,
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  actions,
}: ManagementPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
          <Icon className="w-5 h-5 text-[var(--groups1-text)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--groups1-text)]">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[var(--groups1-text-secondary)]">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-sm border border-[var(--groups1-border)] rounded-lg px-3 py-1.5 bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
