"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UserMenu } from "@/components/common/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

export function PublicNavbar() {
  const [mounted, setMounted] = useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    setMounted(true);
    // Also check localStorage for token
    if (typeof window !== "undefined" && !accessToken) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        // Token exists but not in store, user is logged in
        // The store will be updated on next page load
      }
    }
  }, [accessToken]);

  const isLoggedIn = mounted && (accessToken || (typeof window !== "undefined" && localStorage.getItem("accessToken")));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)] backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 transition-all hover:brightness-95">
            <Image
              src="/assets/logo.png"
              alt="BrainScale CRM"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold tracking-tight md:text-base text-[var(--groups1-text)]">
              BrainScale CRM
            </span>
          </Link>
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/features" className="transition hover:text-[var(--groups1-primary)] text-[var(--groups1-text)]">
            Features
          </Link>
          <Link href="/integrations" className="transition hover:text-[var(--groups1-primary)] text-[var(--groups1-text)]">
            Integrations
          </Link>
          <Link href="/about" className="transition hover:text-[var(--groups1-primary)] text-[var(--groups1-text)]">
            About
          </Link>
          <Link href="/contact" className="transition hover:text-[var(--groups1-primary)] text-[var(--groups1-text)]">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <Link href="/app">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="inline-flex border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  Dashboard
                </Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm transition hover:text-[var(--groups1-primary)] text-[var(--groups1-text)] sm:inline-block"
              >
                Login
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
                  Start free
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


