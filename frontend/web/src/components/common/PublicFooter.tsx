import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Twitter, Github, Linkedin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-[var(--groups1-border)] bg-[var(--groups1-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 text-sm md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/assets/logo.png"
                alt="BrainScale CRM"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span className="font-semibold text-[var(--groups1-text)]">BrainScale CRM</span>
            </Link>
            <p className="leading-relaxed text-[var(--groups1-text-secondary)]">
              A modern CRM built for outbound teams who need to move fast.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Twitter"
                className="text-[var(--groups1-text-secondary)] transition hover:text-[var(--groups1-primary)]"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="text-[var(--groups1-text-secondary)] transition hover:text-[var(--groups1-primary)]"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-[var(--groups1-text-secondary)] transition hover:text-[var(--groups1-primary)]"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 font-semibold text-[var(--groups1-text)]">Product</p>
            <ul className="space-y-3 text-[var(--groups1-text-secondary)]">
              {[
                ["Overview", "/"],
                ["Features", "/features"],
                ["Pricing", "/pricing"],
                ["Integrations", "/integrations"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition hover:text-[var(--groups1-primary)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 font-semibold text-[var(--groups1-text)]">Company</p>
            <ul className="space-y-3 text-[var(--groups1-text-secondary)]">
              {[
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Privacy Policy", "/privacy"],
                ["Terms of Service", "/terms"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition hover:text-[var(--groups1-primary)]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <p className="font-semibold text-[var(--groups1-text)]">Stay in the loop</p>
            <p className="text-[var(--groups1-text-secondary)]">
              Get product updates and tips in your inbox.
            </p>
            <form className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="you@company.com"
                aria-label="Email for updates"
                className="w-full rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] px-3 py-2 text-sm text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              />
              <Button
                size="sm"
                className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--groups1-border)] pt-6 text-xs text-[var(--groups1-text-secondary)] sm:flex-row">
          <p>© {new Date().getFullYear()} BrainScale CRM. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition hover:text-[var(--groups1-primary)]">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-[var(--groups1-primary)]">
              Terms
            </Link>
            <Link href="/contact" className="transition hover:text-[var(--groups1-primary)]">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
