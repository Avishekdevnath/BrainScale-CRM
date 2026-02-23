"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UserMenu } from "@/components/common/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentWorkspaceId = useWorkspaceStore((state) => state.getCurrentId());

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLoggedIn = mounted && !!accessToken;
  const hasWorkspace = mounted && !!currentWorkspaceId;

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "border-b border-[var(--groups1-border)] bg-[var(--groups1-surface)]/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 transition-opacity hover:opacity-80">
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-[var(--groups1-text-secondary)] transition hover:text-[var(--groups1-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <>
              <Link href={hasWorkspace ? "/app" : "/create-workspace"}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  {hasWorkspace ? "Dashboard" : "Create workspace"}
                </Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-primary)] transition"
              >
                Login
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] px-5"
                >
                  Start free
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] transition"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-primary)] transition"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[var(--groups1-border)] flex flex-col gap-2">
            {isLoggedIn ? (
              <Link href={hasWorkspace ? "/app" : "/create-workspace"} onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-[var(--groups1-border)] text-[var(--groups1-text)]"
                >
                  {hasWorkspace ? "Dashboard" : "Create workspace"}
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-[var(--groups1-border)] text-[var(--groups1-text)]"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                  >
                    Start free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
