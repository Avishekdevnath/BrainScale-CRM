"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserPlus, Clock, FileText, ChevronDown } from "lucide-react";

export interface CallListActionsMenuProps {
  onEdit: () => void;
  onAddStudents: () => void;
  onViewFollowups: () => void;
  onViewDetails: () => void;
  onDelete: () => void;
  isAdmin?: boolean;
}

export function CallListActionsMenu({
  onEdit,
  onAddStudents,
  onViewFollowups,
  onViewDetails,
  onDelete,
  isAdmin = false,
}: CallListActionsMenuProps) {
  if (!isAdmin) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
        >
          Actions
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          className="min-w-[200px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg z-50"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
            onSelect={(event) => {
              event.preventDefault();
              onAddStudents();
            }}
          >
            <UserPlus className="h-4 w-4" />
            <span className="font-medium">Add Students</span>
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
          
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
            onSelect={(event) => {
              event.preventDefault();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenu.Item>
          
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
            onSelect={(event) => {
              event.preventDefault();
              onViewFollowups();
            }}
          >
            <Clock className="h-4 w-4" />
            View Follow-ups
          </DropdownMenu.Item>
          
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)]"
            onSelect={(event) => {
              event.preventDefault();
              onViewDetails();
            }}
          >
            <FileText className="h-4 w-4" />
            View Details
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
          
          <DropdownMenu.Item
            className="flex cursor-pointer select-none items-center gap-2 rounded px-3 py-2 text-sm text-red-600 dark:text-red-300 outline-none hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-50 dark:focus:bg-red-900/30"
            onSelect={(event) => {
              event.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

