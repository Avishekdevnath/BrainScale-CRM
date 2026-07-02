"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LayoutDashboard, Building2, Users, ArrowLeft, Shield, ScrollText, MessageSquare, SlidersHorizontal, Megaphone } from "lucide-react";
import { useCurrentUser } from "@/hooks/usePlatform";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UserMenu } from "@/components/common/UserMenu";
import { cn } from "@/lib/utils";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (error || (user && !user.isSuperAdmin))) {
      router.replace("/app");
    }
  }, [isLoading, error, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--groups1-text-secondary)]">
        Redirecting…
      </div>
    );
  }

  const nav = [
    { href: "/platform", label: "Overview", icon: LayoutDashboard },
    { href: "/platform/workspaces", label: "Workspaces", icon: Building2 },
    { href: "/platform/users", label: "Users", icon: Users },
    { href: "/platform/audit", label: "Audit Log", icon: ScrollText },
    { href: "/platform/feedback", label: "Feedback", icon: MessageSquare },
    { href: "/platform/announcements", label: "Announcements", icon: Megaphone },
    { href: "/platform/features", label: "Features", icon: SlidersHorizontal },
  ];

  return (
    <div className="flex flex-col h-screen bg-[var(--groups1-bg)]">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] shrink-0">
        <div className="flex items-center gap-2.5">
          <Image src="/assets/logo.png" alt="BrainScale CRM" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold text-[var(--groups1-text)]">BrainScale CRM</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)] border border-[var(--groups1-primary)]/20">
            <Shield className="w-3 h-3" /> Platform
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 border-r border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 flex flex-col">
          <nav className="space-y-1 flex-1">
            {nav.map((n) => {
              const active = n.href === "/platform" ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    active
                      ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                      : "text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]",
                  )}
                >
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          {/* User identity footer */}
          <div className="mt-2 pt-3 border-t border-[var(--groups1-border)] px-2">
            <p className="text-xs font-medium text-[var(--groups1-text)] truncate">{user.name || "Super Admin"}</p>
            <p className="text-[11px] text-[var(--groups1-text-secondary)] truncate">{user.email}</p>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
