import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-slate-900) 0%, var(--groups1-primary) 60%, var(--color-teal-300) 100%)",
        }}
      />
      {/* Decorative orbs */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/8 blur-2xl" />

      <div className="relative space-y-6 px-8 py-14 text-center sm:py-16">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to scale your outreach?
        </h2>
        <p className="mx-auto max-w-lg text-lg text-white/80">
          Join 120+ teams who&apos;ve replaced spreadsheets and legacy CRMs with BrainScale.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
          {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-white" />
              {t}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
          <Link href="/signup">
            <Button
              size="lg"
              className="h-12 bg-white px-8 text-base font-semibold text-[var(--groups1-primary)] shadow-md hover:bg-white/90"
            >
              Start for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              className="h-12 border border-white/50 bg-transparent px-8 text-base text-white hover:bg-white/10"
            >
              Talk to sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
