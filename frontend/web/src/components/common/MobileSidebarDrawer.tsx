"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function MobileSidebarDrawer({ open, onClose, title = "Menu", children }: MobileSidebarDrawerProps) {
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
        <div className="h-[calc(100%-56px)] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

