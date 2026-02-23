import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export function PublicHero() {
  return (
    <section className="relative w-full overflow-hidden py-16 sm:py-24">
      {/* Background decorative orbs */}
      <div className="pointer-events-none absolute -right-48 -top-48 h-[600px] w-[600px] rounded-full bg-[var(--groups1-primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[var(--groups1-primary)]/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-primary)]/30 bg-[var(--groups1-primary)]/8 px-4 py-1.5 text-xs font-semibold text-[var(--groups1-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            Built for high-velocity outbound teams
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8 space-y-4 text-center">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-7xl text-[var(--groups1-text)]">
            The CRM your team
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--groups1-primary) 0%, var(--color-teal-300) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              actually loves
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--groups1-text-secondary)] sm:text-xl">
            Search by phone or email, log calls in seconds, set intelligent follow-ups, and visualize team performance—all in one workspace.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="mb-5 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 bg-[var(--groups1-primary)] px-8 text-base font-semibold text-[var(--groups1-btn-primary-text)] shadow-md hover:bg-[var(--groups1-primary-hover)]"
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/features">
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-8 text-base text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              See all features
            </Button>
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mb-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--groups1-text-secondary)]">
          {["No credit card required", "2-minute setup", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--groups1-primary)]" />
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard screenshot with browser chrome */}
        <div className="relative mx-auto max-w-5xl">
          {/* Glow */}
          <div className="absolute -inset-4 rounded-3xl bg-[var(--groups1-primary)]/12 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[var(--groups1-border)] bg-[var(--groups1-background)] px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="mx-auto flex items-center rounded-md bg-[var(--groups1-secondary)] px-3 py-1 text-xs text-[var(--groups1-text-secondary)]">
                app.brainscale.io/dashboard
              </div>
            </div>
            <div className="relative aspect-video">
              <Image
                src="/assets/smartcrm.png"
                alt="BrainScale CRM Dashboard"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </div>
        </div>

        {/* Social proof stats */}
        <div className="mx-auto mt-12 grid max-w-xl grid-cols-3 gap-8 text-center">
          {[
            { value: "120+", label: "Teams" },
            { value: "1.2M+", label: "Calls Logged" },
            { value: "4.8★", label: "Avg. Rating" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-[var(--groups1-primary)] sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-[var(--groups1-text-secondary)] sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
