import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="section-alt border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-6 sm:p-8 rounded-xl">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h3 className="text-lg font-medium text-[var(--groups1-text)]">Ready to get started?</h3>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Create your account and start logging calls in minutes.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/signup">
            <Button className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]">
              Start for free
            </Button>
          </Link>
          <Link href="/login">
            <Button className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}


