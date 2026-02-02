"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useLogout";
import { useAuthStore, getUserInitials } from "@/store/auth";

export interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function MobileSidebarDrawer({ open, onClose, title = "Menu", children }: MobileSidebarDrawerProps) {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  const initials = getUserInitials(user) || "U";
  const displayName = user?.name || user?.email || "User";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label="Close menu overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-72 max-w-[85vw]",
          "bg-[var(--groups1-surface)] border-r border-[var(--groups1-border)] shadow-2xl"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-14 px-3 flex items-center justify-between border-b border-[var(--groups1-border)]">
          <div className="text-sm font-semibold text-[var(--groups1-text)]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg",
              "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
            )}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[calc(100%-56px)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          <div className="border-t border-[var(--groups1-border)] p-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm bg-[var(--groups1-primary,#4f46e5)] text-[var(--groups1-btn-primary-text,#ffffff)]"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--groups1-text,#0f172a)] truncate">
                  {displayName}
                </div>
                {user?.email ? (
                  <div className="text-xs text-[var(--groups1-text-secondary,#475569)] truncate">
                    {user.email}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className={cn(
                  "h-10 px-3 rounded-lg inline-flex items-center gap-2 text-sm font-medium",
                  "bg-[var(--groups1-surface)] border border-[var(--groups1-border)]",
                  "text-[var(--groups1-text,#0f172a)] hover:bg-[var(--groups1-secondary,#eef2ff)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring,#a5b4fc)]"
                )}
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
