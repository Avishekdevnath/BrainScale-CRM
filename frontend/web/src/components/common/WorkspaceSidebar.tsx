"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  Phone,
  PhoneCall,
  Download,
  UserCog,
  Settings,
  HelpCircle,
  Menu,
  LogOut,
  GraduationCap,
  BookOpen,
  FolderOpen,
  Upload,
  UserPlus,
  Shield,
  Mail,
  FileText,
  CreditCard,
  FileCheck,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { useMyCallsStats } from "@/hooks/useMyCalls";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const workspaceNavItems: NavItem[] = [
  // Overview
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  
  // Student Management
  { href: "/app/students", label: "Students", icon: Users },
  { href: "/app/group-management", label: "Groups", icon: FolderOpen },
  { href: "/app/batches", label: "Batches", icon: Layers, adminOnly: true },
  { href: "/app/enrollments", label: "Enrollments", icon: GraduationCap },
  
  // Learning Content
  { href: "/app/courses", label: "Courses", icon: BookOpen },
  { href: "/app/modules", label: "Modules", icon: FileText },
  
  // Engagement
  { href: "/app/calls", label: "Calls", icon: Phone },
  { href: "/app/my-calls", label: "My Calls", icon: PhoneCall },
  { href: "/app/call-lists", label: "Call Lists", icon: PhoneCall },
  { href: "/app/followups", label: "Follow-ups", icon: Clock },
  
  // Data Operations
  { href: "/app/imports", label: "Imports", icon: Upload },
  { href: "/app/exports", label: "Exports", icon: Download },
  
  // Administration (Admin Only)
  { href: "/app/members", label: "Members & Roles", icon: UserCog, adminOnly: true },
  { href: "/app/custom-roles", label: "Custom Roles", icon: Shield, adminOnly: true },
  { href: "/app/invitations", label: "Invitations", icon: UserPlus, adminOnly: true },
  { href: "/app/workspace-settings", label: "Workspace Settings", icon: Settings, adminOnly: true },
  
  // System (Admin Only)
  { href: "/app/audit-logs", label: "Audit Logs", icon: FileCheck, adminOnly: true },
  { href: "/app/email-settings", label: "Email Settings", icon: Mail, adminOnly: true },
  { href: "/app/billing", label: "Plan & Billing", icon: CreditCard, adminOnly: true },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const workspaceName = useWorkspaceStore((state) => state.getCurrentName());
  const { data: myCallsStats } = useMyCallsStats();

  // TODO: Replace with actual role check from auth/store
  // For now, showing all items (assuming admin)
  const isAdmin = true;

  const pendingCallsCount = myCallsStats?.pending || 0;

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app" || pathname === "/app/";
    }
    // Handle special case: /app/calls vs /app/my-calls vs /app/call-lists
    if (href === "/app/calls") {
      return pathname === "/app/calls" || pathname?.startsWith("/app/calls/");
    }
    if (href === "/app/my-calls") {
      return pathname === "/app/my-calls" || pathname?.startsWith("/app/my-calls/");
    }
    if (href === "/app/call-lists") {
      return pathname === "/app/call-lists" || pathname?.startsWith("/app/call-lists/");
    }
    return pathname?.startsWith(href);
  };

  // Filter items based on admin status
  const visibleItems = workspaceNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

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
                {workspaceName}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const showBadge = item.href === "/app/my-calls" && pendingCallsCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all mb-1 relative",
                "hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]",
                active
                  ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:text-[var(--groups1-btn-primary-text)]"
                  : "text-[var(--groups1-text)]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {showBadge && (
                <span className={cn(
                  "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold",
                  active
                    ? "bg-[var(--groups1-btn-primary-text)] text-[var(--groups1-primary)]"
                    : "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                )}>
                  {pendingCallsCount > 99 ? "99+" : pendingCallsCount}
                </span>
              )}
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

