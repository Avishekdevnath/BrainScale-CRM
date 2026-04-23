"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const CurrentIcon = !mounted ? Sun : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]",
            !mounted && "opacity-0"
          )}
        >
          <CurrentIcon className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 min-w-[140px] rounded-lg border p-1",
            "bg-[var(--groups1-surface)] border-[var(--groups1-border)]",
            "shadow-lg shadow-black/10",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          )}
        >
          {options.map(({ value, label, Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => setTheme(value)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer",
                "text-[var(--groups1-text)] outline-none",
                "hover:bg-[var(--groups1-secondary)]",
                "focus:bg-[var(--groups1-secondary)]",
                theme === value && "text-[var(--groups1-primary)] font-medium"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
              {theme === value && (
                <span className="ml-auto text-[var(--groups1-primary)]">✓</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

