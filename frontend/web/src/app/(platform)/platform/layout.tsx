"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LayoutDashboard, Building2, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/usePlatform";
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
  ];

  return (
    <div className="flex min-h-screen bg-[var(--groups1-bg)]">
      <aside className="w-56 border-r border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-1">
        <div className="px-2 pb-4">
          <p className="text-sm font-bold text-[var(--groups1-text)]">Platform</p>
          <p className="text-xs text-[var(--groups1-text-secondary)]">Super-admin console</p>
        </div>
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
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
