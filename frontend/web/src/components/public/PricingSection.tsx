"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: { monthly: 0, annual: 0 },
    description: "Perfect for small teams getting started.",
    cta: "Start for free",
    ctaHref: "/signup",
    highlighted: false,
    features: [
      "Up to 3 users",
      "1 workspace",
      "1,000 students",
      "Call logging & follow-ups",
      "CSV import",
      "Email support",
    ],
  },
  {
    name: "Team",
    price: { monthly: 29, annual: 23 },
    description: "For growing teams who need more power.",
    cta: "Start 14-day trial",
    ctaHref: "/signup?plan=team",
    highlighted: true,
    badge: "Most popular",
    features: [
      "Up to 15 users",
      "3 workspaces",
      "Unlimited students",
      "Custom roles & permissions",
      "CSV/XLSX import with rollback",
      "Analytics & KPI dashboards",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: { monthly: 79, annual: 63 },
    description: "Enterprise-grade features for large orgs.",
    cta: "Contact sales",
    ctaHref: "/contact",
    highlighted: false,
    features: [
      "Unlimited users",
      "Unlimited workspaces",
      "Audit logs",
      "SSO & advanced security",
      "AI-powered assistant",
      "Dedicated onboarding",
      "SLA & 24/7 support",
    ],
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section>
      <div className="mb-12 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] px-3 py-1 text-xs font-medium text-[var(--groups1-text-secondary)]">
          Pricing
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--groups1-text)] sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="text-lg text-[var(--groups1-text-secondary)]">No hidden fees. No surprise bills.</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span
            className={`text-sm font-medium ${
              !annual ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]"
            }`}
          >
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
              annual ? "bg-[var(--groups1-primary)]" : "bg-[var(--groups1-secondary)]"
            }`}
          >
            <span
              className={`m-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                annual ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              annual ? "text-[var(--groups1-text)]" : "text-[var(--groups1-text-secondary)]"
            }`}
          >
            Annual
            <span className="ml-1.5 inline-flex items-center rounded-full bg-[var(--groups1-primary)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--groups1-primary)]">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            variant="groups1"
            className={`relative overflow-hidden transition-all duration-200 hover:-translate-y-1 ${
              plan.highlighted ? "border-2 border-[var(--groups1-primary)] shadow-lg" : ""
            }`}
          >
            {plan.badge && (
              <div className="absolute right-0 top-0 rounded-bl-xl bg-[var(--groups1-primary)] px-3 py-1 text-xs font-semibold text-[var(--groups1-btn-primary-text)]">
                {plan.badge}
              </div>
            )}
            <div className="flex h-full flex-col gap-5 p-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--groups1-text)]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[var(--groups1-text-secondary)]">{plan.description}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-[var(--groups1-text)]">
                  ${annual ? plan.price.annual : plan.price.monthly}
                </span>
                {(annual ? plan.price.annual : plan.price.monthly) > 0 ? (
                  <span className="mb-1 text-sm text-[var(--groups1-text-secondary)]">/mo</span>
                ) : (
                  <span className="mb-1 text-sm text-[var(--groups1-text-secondary)]">forever</span>
                )}
              </div>

              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--groups1-text)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--groups1-primary)]" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaHref}>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                      : "border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--groups1-text-secondary)]">
        All paid plans include a 14-day free trial. No credit card required for Starter.
      </p>
    </section>
  );
}
