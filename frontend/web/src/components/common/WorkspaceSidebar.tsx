"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  Phone,
  PhoneCall,
  Download,
  UserCog,
  Settings,
  Menu,
  LogOut,
  GraduationCap,
  BookOpen,
  FolderOpen,
  Upload,
  UserPlus,
  Mail,
  FileText,
  CreditCard,
  FileCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { useMyCallsStats } from "@/hooks/useMyCalls";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  adminOnly?: boolean;
  collapsible?: boolean;
}

const navSections: NavSection[] = [
  // Overview
  {
    label: "",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  
  // Student Management
  {
    label: "Students & Learning",
    icon: Users,
    items: [
      { href: "/app/students", label: "Students", icon: Users },
      { href: "/app/group-management", label: "Groups", icon: FolderOpen },
      { href: "/app/batches", label: "Batches", icon: Layers, adminOnly: true },
      { href: "/app/enrollments", label: "Enrollments", icon: GraduationCap },
      { href: "/app/courses", label: "Courses", icon: BookOpen },
      { href: "/app/modules", label: "Modules", icon: FileText },
    ],
  },
  
  // Engagement & Communication
  {
    label: "Engagement",
    icon: Phone,
    items: [
      { href: "/app/my-calls", label: "My Calls", icon: PhoneCall },
      { href: "/app/calls-manager", label: "Calls Manager", icon: Phone },
      { href: "/app/calls", label: "All Calls", icon: Phone },
      { href: "/app/call-lists", label: "Call Lists", icon: PhoneCall },
      { href: "/app/call-logs", label: "Call Logs", icon: FileCheck },
      { href: "/app/followups", label: "Follow-ups", icon: Clock },
    ],
  },
  
  // Data Management
  {
    label: "Data",
    icon: Database,
    items: [
      { href: "/app/imports", label: "Imports", icon: Upload },
      { href: "/app/exports", label: "Exports", icon: Download },
    ],
  },
  
  // Administration (Admin Only)
  {
    label: "Administration",
    icon: UserCog,
    adminOnly: true,
    items: [
      { href: "/app/members", label: "Members & Roles", icon: UserCog },
      { href: "/app/invitations", label: "Invitations", icon: UserPlus },
      { href: "/app/workspace-settings", label: "Workspace Settings", icon: Settings },
    ],
  },
  
  // System Settings (Admin Only)
  {
    label: "System",
    icon: Settings,
    adminOnly: true,
    items: [
      { href: "/app/audit-logs", label: "Audit Logs", icon: FileCheck },
      { href: "/app/email-settings", label: "Email Settings", icon: Mail },
      { href: "/app/billing", label: "Plan & Billing", icon: CreditCard },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([])
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const { data: myCallsStats } = useMyCallsStats();
  const isAdmin = useIsAdmin();

  // Handle workspace name client-side only to avoid hydration mismatch
  useEffect(() => {
    setWorkspaceName(currentWorkspace?.name || "");
  }, [currentWorkspace]);

  const pendingCallsCount = myCallsStats?.pending || 0;

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app" || pathname === "/app/";
    }
    // Handle special case: /app/calls-manager vs /app/calls vs /app/my-calls vs /app/call-lists
    if (href === "/app/calls-manager") {
      return pathname === "/app/calls-manager" || pathname?.startsWith("/app/calls-manager/");
    }
    if (href === "/app/calls") {
      return pathname === "/app/calls" || pathname?.startsWith("/app/calls/");
    }
    if (href === "/app/my-calls") {
      return pathname === "/app/my-calls" || pathname?.startsWith("/app/my-calls/");
    }
    if (href === "/app/call-lists") {
      return pathname === "/app/call-lists" || pathname?.startsWith("/app/call-lists/");
    }
    if (href === "/app/call-logs") {
      return pathname === "/app/call-logs" || pathname?.startsWith("/app/call-logs/");
    }
    return pathname?.startsWith(href);
  };

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Filter sections and items based on admin status
  const visibleSections = navSections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0); // Only show sections with visible items

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
          className="flex items-center gap-3 transition-all hover:brightness-95"
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
        {visibleSections.map((section, sectionIndex) => {
          const isExpanded = !section.label || expandedSections.has(section.label);
          const SectionIcon = section.icon;
          
          return (
            <div key={section.label || `section-${sectionIndex}`} className="mb-4">
              {/* Section Header */}
              {section.label && !collapsed && (
                <button
                  onClick={() => section.collapsible !== false && toggleSection(section.label)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-md text-xs font-semibold uppercase tracking-wider",
                    "text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors",
                    section.collapsible !== false && "cursor-pointer hover:bg-[var(--groups1-secondary)]"
                  )}
                >
                  {SectionIcon && <SectionIcon className="w-3.5 h-3.5" />}
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.collapsible !== false && (
                    isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )
                  )}
                </button>
              )}

              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const showBadge = item.href === "/app/my-calls" && pendingCallsCount > 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all relative",
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Utility Section */}
      <div className="p-2 border-t border-[var(--groups1-border)] space-y-1 flex-shrink-0">
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

