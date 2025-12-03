"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Clock, PhoneCall, Settings, HelpCircle, Menu, LogOut, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";
import { useGroupStore } from "@/store/group";
import { useLogout } from "@/hooks/useLogout";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const groupNavItems: NavItem[] = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "students", label: "Students", icon: Users },
  { href: "imports", label: "Import Students", icon: Upload },
  { href: "followups", label: "Follow-ups", icon: Clock },
  { href: "call-lists", label: "Call Lists", icon: PhoneCall },
  { href: "settings", label: "Settings", icon: Settings },
];

export function GroupSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { current: currentGroup } = useGroupStore();
  const groupName = currentGroup?.name || "Batch A";
  const logout = useLogout();

  // Get current group ID from URL for building group-specific links
  const currentGroupId = pathname?.match(/^\/app\/groups\/([^/]+)/)?.[1] || currentGroup?.id || "1";
  const isOnGroupsList = pathname === "/app/groups";
  const isOnGroupDetail = currentGroupId && pathname?.startsWith(`/app/groups/${currentGroupId}`);

  const isActive = (href: string) => {
    // Dashboard is active if we're on the dashboard page
    if (href === "dashboard") {
      return pathname === `/app/groups/${currentGroupId}/dashboard`;
    }
    // Call lists is active if we're on the group call lists page
    if (href === "call-lists") {
      return pathname === `/app/groups/${currentGroupId}/call-lists`;
    }
    // For other routes, check if pathname matches nested routes like /app/groups/[groupId]/students
    if (isOnGroupDetail) {
      return pathname === `/app/groups/${currentGroupId}/${href}`;
    }
    return false;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-[var(--groups1-surface)] border-[var(--groups1-border)] transition-all duration-250 h-screen",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[var(--groups1-border)] flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--groups1-primary)] flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              className="text-[var(--groups1-btn-primary-text)]"
            >
              <path
                d="M8 16L14 10L18 14L24 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="14" cy="10" r="2" fill="currentColor" />
              <circle cx="18" cy="14" r="2" fill="currentColor" />
              <circle cx="24" cy="8" r="2" fill="currentColor" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="text-base font-bold text-[var(--groups1-text)] truncate">
                BrainScale CRM
              </div>
              <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                {groupName}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {groupNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          // Build href with group ID
          let href = `/app/groups/${currentGroupId}`;
          if (item.href === "dashboard") {
            // Dashboard route
            href = `/app/groups/${currentGroupId}/dashboard`;
          } else if (item.href === "call-lists") {
            // Group-specific call lists page
            href = `/app/groups/${currentGroupId}/call-lists`;
          } else {
            // For future nested routes like /app/groups/[groupId]/students
            href = `/app/groups/${currentGroupId}/${item.href}`;
          }
          
          return (
            <Link
              key={item.href}
              href={href}
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
      <div className="p-2 border-t border-[var(--groups1-border)] space-y-1 flex-shrink-0">
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
          onClick={logout}
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

