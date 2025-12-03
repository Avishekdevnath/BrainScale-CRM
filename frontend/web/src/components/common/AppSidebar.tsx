"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  PhoneCall,
  Download,
  UserCog,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/students", label: "Students", icon: Users },
  { href: "/app/followups", label: "Follow-ups", icon: Clock },
  { href: "/app/call-lists", label: "Call Lists", icon: PhoneCall },
  { href: "/app/imports", label: "Imports / Exports", icon: Download },
  { href: "/app/members", label: "Members & Roles", icon: UserCog },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app" || pathname === "/app/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-[var(--groups1-surface)] border-[var(--groups1-border)] transition-all duration-250 h-screen",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[var(--groups1-border)]">
        <Link
          href="/app"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/assets/logo.png"
            alt="BrainScale CRM"
            width={32}
            height={32}
            className="flex-shrink-0 w-8 h-8 object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="text-base font-bold text-[var(--groups1-text)] truncate">
                BrainScale CRM
              </div>
              <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                DreamEd Academy
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all mb-1",
                "hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]",
                active
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:text-[var(--groups1-btn-primary-text)]"
                  : "text-[var(--groups1-text)]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Utility Section */}
      <div className="p-2 border-t border-[var(--groups1-border)] space-y-1">
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          )}
          title={collapsed ? "Help & Docs" : undefined}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Help & Docs</span>}
        </button>
        <div
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm",
            "text-[var(--groups1-text)]"
          )}
        >
          <ThemeToggle />
          {!collapsed && <span className="text-sm">Theme</span>}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          )}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
