import type { Metadata } from "next";
import { PublicHero } from "@/components/public/PublicHero";
import { CapabilitiesSection } from "@/components/public/CapabilitiesSection";
import { PricingSection } from "@/components/public/PricingSection";
import { CTASection } from "@/components/public/CTASection";
import { FAQSection } from "@/components/public/FAQSection";
import { IntegrationsGrid } from "@/components/public/IntegrationsGrid";

export const metadata: Metadata = {
  title: "BrainScale CRM - Modern CRM",
};

export default function HomePage() {
  return (
    <div className="w-full mx-auto max-w-7xl px-4 py-0 space-y-0 bg-[var(--groups1-background)]">
      <section className="pt-4 pb-12 min-h-[88vh] flex items-center">
        <PublicHero />
      </section>

      <section id="features" className="py-14">
        <div className="w-full mx-auto max-w-7xl px-2">
          <CapabilitiesSection />
        </div>
      </section>

      <section id="pricing" className="py-16 min-h-[70vh] flex items-center">
        <div className="w-full mx-auto max-w-7xl px-2">
          <PricingSection />
        </div>
      </section>

      <section id="integrations" className="py-12 min-h-[55vh] flex items-center">
        <div className="w-full mx-auto max-w-7xl px-2">
          <IntegrationsGrid />
        </div>
      </section>

      <section className="pt-12 pb-8">
        <div className="w-full mx-auto max-w-7xl px-2">
          <FAQSection />
        </div>
      </section>

      <section className="pt-8 pb-14">
        <div className="w-full mx-auto max-w-7xl px-2">
          <CTASection />
        </div>
      </section>
    </div>
  );
}


