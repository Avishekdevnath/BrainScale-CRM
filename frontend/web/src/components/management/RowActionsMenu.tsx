"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

export interface RowActionsMenuProps {
  actions: RowAction[];
}

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="p-1 rounded-lg text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          aria-label="Row actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[160px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg"
          align="end"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenu.Item
                key={action.key}
                disabled={action.disabled}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm outline-none",
                  action.variant === "destructive"
                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
                  action.disabled && "opacity-50 cursor-not-allowed"
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  action.onSelect();
                }}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
