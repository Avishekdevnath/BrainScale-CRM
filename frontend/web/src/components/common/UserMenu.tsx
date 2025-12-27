"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore, getUserInitials } from "@/store/auth";

export function UserMenu() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = getUserInitials(user);
  const displayName = user?.name || user?.email || "User";

  if (!mounted) {
    // During SSR, always render "U" to match server output and prevent hydration mismatch
    return (
      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] font-semibold text-sm transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
        aria-label="User menu"
      >
        U
      </button>
    );
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] font-semibold text-sm transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
          aria-label="User menu"
          title={displayName}
        >
          {initials}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[180px] bg-[var(--groups1-surface)] border border-[var(--groups1-border)] rounded-lg shadow-lg p-1 z-50"
          )}
          sideOffset={8}
          align="end"
        >
          <div className="px-3 py-2 text-sm">
            <div className="font-medium text-[var(--groups1-text)]">{displayName}</div>
            {user?.email && (
              <div className="text-xs text-[var(--groups1-text-secondary)] mt-0.5">{user.email}</div>
            )}
          </div>
          <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm text-[var(--groups1-text)] rounded-md cursor-pointer",
              "hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)] outline-none"
            )}
          >
            <User className="w-4 h-4" />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm text-[var(--groups1-text)] rounded-md cursor-pointer",
              "hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)] outline-none"
            )}
          >
            <Settings className="w-4 h-4" />
            Preferences
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-px bg-[var(--groups1-border)] my-1" />
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm text-[var(--groups1-text)] rounded-md cursor-pointer",
              "hover:bg-[var(--groups1-secondary)] focus:bg-[var(--groups1-secondary)] outline-none"
            )}
            onSelect={(event) => {
              event.preventDefault();
              logout();
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

