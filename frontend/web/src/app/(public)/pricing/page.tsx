import type { Metadata } from "next";
import { PricingSection } from "@/components/public/PricingSection";
import { CTASection } from "@/components/public/CTASection";
import { FAQSection } from "@/components/public/FAQSection";

export const metadata: Metadata = {
  title: "Pricing – BrainScale CRM",
  description: "Simple, transparent pricing for teams of all sizes. Start free, no credit card required.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-24 px-4 py-16 pb-24">
      <PricingSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}
