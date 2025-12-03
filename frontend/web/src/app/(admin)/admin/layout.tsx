import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, Building2, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/access-control", label: "Access Control", icon: Shield },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r bg-[var(--groups1-surface)] border-[var(--groups1-border)] p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--groups1-text)]">Admin Console</h2>
          <p className="text-xs text-[var(--groups1-text-secondary)]">System Management</p>
        </div>
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-[var(--groups1-background)]">
        {children}
      </main>
    </div>
  );
}

