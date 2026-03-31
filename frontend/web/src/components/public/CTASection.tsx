import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* Theme-aware gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--groups1-cta-gradient-start) 0%, var(--groups1-primary) 60%, var(--groups1-text-gradient-end) 100%)",
        }}
      />

      {/* Subtle dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Decorative orbs */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/8 blur-2xl" />

      <div className="relative px-8 py-14 text-center sm:py-20">
        {/* Eyebrow */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
          <Zap className="h-3 w-3" />
          Join 120+ fast-moving teams
        </div>

        {/* Headline */}
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Ready to scale your outreach?
        </h2>

        {/* Subtext */}
        <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
          Replace spreadsheets and legacy CRMs with a workspace your team actually opens every day.
        </p>

        {/* CTA buttons */}
        <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 bg-white px-8 text-base font-semibold text-[var(--groups1-primary)] shadow-lg transition-all duration-200 hover:bg-white/90 hover:shadow-xl hover:-translate-y-0.5"
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              className="h-12 border border-white/40 bg-white/10 px-8 text-base text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              Talk to sales
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-white/90" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
