import { Button } from "@/components/ui/button";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-[var(--groups1-border)] bg-[var(--groups1-surface)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 text-sm md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[var(--groups1-primary)]" />
              <span className="font-medium text-[var(--groups1-text)]">BrainScale CRM</span>
            </div>
            <p className="text-[var(--groups1-text-secondary)]">
              A modern CRM for calls, follow-ups, and team workflows.
            </p>
            <form className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Email for updates"
                aria-label="Email for updates"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
              />
              <Button size="sm" className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
                Subscribe
              </Button>
            </form>
          </div>
          <div>
            <p className="font-medium text-[var(--groups1-text)]">Product</p>
            <ul className="mt-3 space-y-2 text-[var(--groups1-text-secondary)]">
              <li>
                <a href="/" className="transition hover:text-[var(--groups1-primary)]">
                  Overview
                </a>
              </li>
              <li>
                <a href="#features" className="transition hover:text-[var(--groups1-primary)]">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition hover:text-[var(--groups1-primary)]">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-[var(--groups1-text)]">Company</p>
            <ul className="mt-3 space-y-2 text-[var(--groups1-text-secondary)]">
              <li>
                <a href="/about" className="transition hover:text-[var(--groups1-primary)]">
                  About
                </a>
              </li>
              <li>
                <a href="/contact" className="transition hover:text-[var(--groups1-primary)]">
                  Contact
                </a>
              </li>
              <li>
                <a href="/privacy" className="transition hover:text-[var(--groups1-primary)]">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="transition hover:text-[var(--groups1-primary)]">
                  Terms
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-[var(--groups1-text)]">Follow</p>
            <ul className="mt-3 space-y-2 text-[var(--groups1-text-secondary)]">
              <li>
                <a href="#" className="transition hover:text-[var(--groups1-primary)]">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-[var(--groups1-primary)]">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-[var(--groups1-primary)]">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 text-xs text-[var(--groups1-text-secondary)] sm:flex-row">
          <p>
            © {new Date().getFullYear()} BrainScale CRM. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <a href="/privacy" className="transition hover:text-[var(--groups1-primary)]">
              Privacy
            </a>
            <span>·</span>
            <a href="/terms" className="transition hover:text-[var(--groups1-primary)]">
              Terms
            </a>
            <span>·</span>
            <a href="/contact" className="transition hover:text-[var(--groups1-primary)]">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


