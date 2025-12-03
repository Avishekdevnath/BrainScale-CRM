import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PublicHero() {
  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16">
          {/* Left: Content */}
          <div className="lg:col-span-6 text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-surface)] px-4 py-1.5 text-xs font-medium">
              <span className="text-[var(--groups1-text)]">Multi-tenant • Secure • Fast</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-[var(--groups1-text)]">
                A modern CRM your team actually{" "}
                <span className="text-[var(--groups1-primary)]">enjoys</span> using
              </h1>
              <p className="text-lg sm:text-xl text-[var(--groups1-text-secondary)] max-w-2xl leading-relaxed">
                Search by phone or email, log calls in seconds, set follow-ups, and visualize progress—all in one place.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] px-8">
                  Start for free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] px-8">
                  Sign in
                </Button>
              </Link>
            </div>

            <p className="text-sm text-[var(--groups1-text-secondary)]">No credit card required • 2-minute setup</p>
          </div>

          {/* Right: Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative">
              {/* Subtle background accent */}
              <div className="absolute -inset-4 bg-[var(--groups1-primary)]/5 rounded-2xl blur-2xl" />
              
              <Card variant="groups1" className="relative rounded-xl shadow-lg border-2 border-[var(--groups1-primary)]/20 overflow-hidden">
                <CardContent variant="groups1" className="p-0">
                  {/* Dashboard Preview Image */}
                  <div className="relative w-full aspect-video">
                    <Image
                      src="/assets/smartcrm.png"
                      alt="BrainScale CRM Dashboard Preview"
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


