"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface MemberSelectorProps {
  selectedMemberId: string | null;
  onSelectMemberId: (memberId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  assigneeName?: string | null; // Optional: Display name from API response
  assigneeEmail?: string | null; // Optional: Display email from API response
}

export function MemberSelector({
  selectedMemberId,
  onSelectMemberId,
  placeholder = "Select member",
  disabled = false,
  assigneeName,
  assigneeEmail,
}: MemberSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);

  // Get workspace ID from store
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const { useWorkspaceStore } = require("@/store/workspace");
        const id = useWorkspaceStore.getState().getCurrentId();
        setWorkspaceId(id);
      } catch {
        setWorkspaceId(null);
      }
    }
  }, []);

  // Fetch members from API
  React.useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const { apiClient } = await import("@/lib/api-client");
        const data = await apiClient.getWorkspaceMembers(workspaceId);
        setMembers(
          data.map((m) => ({
            id: m.id,
            name: m.user.name || m.user.email,
            email: m.user.email,
          }))
        );
      } catch (error: any) {
        // Silently handle access denied errors (403) - user may not have permission to view members
        // Only log unexpected errors
        if (error?.status !== 403 && error?.statusCode !== 403) {
          console.error("Failed to fetch members:", error);
        }
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [workspaceId]);

  const filteredMembers = React.useMemo(() => {
    if (!searchTerm) return members;
    return members.filter((member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  const displayValue = React.useMemo(() => {
    if (!selectedMemberId) return placeholder;
    // Use assigneeName from props if available (from API response)
    if (assigneeName) return assigneeName;
    // Fallback to members list if available
    const member = members.find((m) => m.id === selectedMemberId);
    return member?.name || placeholder;
  }, [selectedMemberId, members, placeholder, assigneeName]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-sm font-normal border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]",
            selectedMemberId
              ? "bg-[var(--groups1-background)] text-[var(--groups1-text)]"
              : "bg-[var(--groups1-surface)] text-[var(--groups1-text-secondary)]"
          )}
          disabled={isLoading || disabled}
        >
          <span className="truncate">{displayValue}</span>
          <Loader2 className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", !isLoading && "hidden")} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg">
          <div className="p-1">
            <Input
              placeholder="Search members..."
              className="h-8 w-full bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <DropdownMenu.Item className="flex items-center justify-center p-2 text-sm text-[var(--groups1-text-secondary)]">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading members...
              </DropdownMenu.Item>
            ) : (
              <>
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    onSelectMemberId(null);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
                    !selectedMemberId && "bg-[var(--groups1-secondary)]"
                  )}
                >
                  Unassigned
                </DropdownMenu.Item>
                {filteredMembers.length === 0 ? (
                  <DropdownMenu.Item className="p-2 text-sm text-[var(--groups1-text-secondary)]">
                    {members.length === 0 ? "No members available" : "No members found"}
                  </DropdownMenu.Item>
                ) : (
                  filteredMembers.map((member) => (
                    <DropdownMenu.Item
                      key={member.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        onSelectMemberId(member.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                        "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
                        selectedMemberId === member.id && "bg-[var(--groups1-secondary)]"
                      )}
                    >
                      <div className="flex flex-col">
                        <span>{member.name}</span>
                        <span className="text-xs text-[var(--groups1-text-secondary)]">{member.email}</span>
                      </div>
                    </DropdownMenu.Item>
                  ))
                )}
              </>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

