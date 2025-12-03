import type { Metadata } from "next";
import { PricingSection } from "@/components/public/PricingSection";
import { ComparisonSection } from "@/components/public/ComparisonSection";

export const metadata: Metadata = {
  title: "Pricing | BrainScale CRM",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-0 space-y-0">
      {/* Pricing plans */}
      <section className="pt-10 pb-10">
        <PricingSection />
      </section>

      {/* Included in all plans */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Included in all plans</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Reliable foundation without hidden fees.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          {["Unlimited contacts", "Import/export CSV/XLSX", "Call & email logging", "Follow-ups & reminders", "Basic dashboards", "Email support"].map((f) => (
            <div key={f} className="rounded-xl border ring-1 ring-[hsl(var(--border))]/60 bg-white/90 dark:bg-black/30 p-4">{f}</div>
          ))}
        </div>
      </section>

      {/* Compare plans */}
      <section className="py-12">
        <ComparisonSection />
      </section>

      {/* Billing benefits */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Billing benefits</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Flexible options as you scale.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          {[
            { t: "Yearly discount", d: "Save 20% with annual billing." },
            { t: "Prorated upgrades", d: "Pay only for the difference when you switch plans." },
            { t: "Cancel anytime", d: "No lock-in. Export your data whenever you want." },
          ].map(({ t, d }) => (
            <div key={t} className="rounded-xl border ring-1 ring-[hsl(var(--border))]/60 bg-white/90 dark:bg-black/30 p-5">
              <div className="font-medium">{t}</div>
              <p className="mt-1.5 text-[hsl(var(--muted-foreground))] dark:text-white/85">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Billing FAQs */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Billing FAQs</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Answers to common pricing questions.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: "Do I need a card to start?", a: "No — Starter is free." },
            { q: "Can I switch plans anytime?", a: "Yes — upgrades are prorated automatically." },
            { q: "Is there a yearly discount?", a: "Yes — save 20% with annual billing." },
            { q: "What happens if I cancel?", a: "Your workspace downgrades to Starter and you can export data." },
          ].map((f) => (
            <details key={f.q} className="rounded-md border border-[hsl(var(--border))] p-4 bg-white/30 dark:bg-white/5">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact sales */}
      <section className="pt-6 pb-14">
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
          <div className="rounded-[calc(theme(borderRadius.2xl)-1px)] bg-white/90 dark:bg-black/30 ring-1 ring-[hsl(var(--border))]/60 p-6 text-center">
            <h4 className="text-lg font-semibold">Need a custom plan?</h4>
            <p className="mt-1 text-[hsl(var(--muted-foreground))]">Talk to us about volume discounts and SSO/SAML.</p>
          </div>
        </div>
      </section>
    </div>
  );
}


