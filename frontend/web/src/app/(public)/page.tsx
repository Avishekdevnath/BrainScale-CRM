import type { Metadata } from "next";
import { PublicHero } from "@/components/public/PublicHero";
import { MetricsBar } from "@/components/public/MetricsBar";
import { CapabilitiesSection } from "@/components/public/CapabilitiesSection";
import { PricingSection } from "@/components/public/PricingSection";
import { TestimonialsSection } from "@/components/public/TestimonialsSection";
import { IntegrationsGrid } from "@/components/public/IntegrationsGrid";
import { FAQSection } from "@/components/public/FAQSection";
import { CTASection } from "@/components/public/CTASection";

export const metadata: Metadata = {
  title: "BrainScale CRM – The CRM Your Team Actually Loves",
  description:
    "Log calls, set follow-ups, and visualize team performance. Built for outbound sales and education enrollment teams.",
};

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Hero – full width with its own max-w constraint */}
      <PublicHero />

      <div className="mx-auto max-w-7xl space-y-24 px-4 pb-24">
        {/* Social proof metrics */}
        <MetricsBar />

        {/* Features */}
        <section id="features">
          <CapabilitiesSection />
        </section>

        {/* Pricing */}
        <section id="pricing">
          <PricingSection />
        </section>

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Integrations */}
        <section id="integrations">
          <IntegrationsGrid />
        </section>

        {/* FAQ */}
        <FAQSection />

        {/* CTA */}
        <CTASection />
      </div>
    </div>
  );
}
