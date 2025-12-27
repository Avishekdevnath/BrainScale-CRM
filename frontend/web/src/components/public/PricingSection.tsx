"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    byline: "Up to 3 users",
    cta: "Start for free",
      features: [
        "Students & Calls",
        "Follow-ups",
        "Basic imports",
        "Contact notes & tags",
        "Email templates (3)",
        "Basic analytics",
      ],
  },
  {
    name: "Team",
    price: "$29",
    byline: "/user/mo",
    cta: "Get started",
    badge: "Recommended",
      features: [
        "Everything in Starter",
        "Advanced imports",
        "Dashboards & charts",
        "Role-based permissions",
        "Team pipelines",
        "Shared templates",
      ],
  },
  {
    name: "Business",
    price: "$59",
    byline: "/user/mo",
    cta: "Get started",
      features: [
        "Custom roles",
        "Members & groups",
        "Priority support",
        "SSO / SAML",
        "Audit logs",
        "API & webhooks",
      ],
  },
];

export function PricingSection() {
  return (
    <section className="w-full">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--groups1-text)]">
            Simple, transparent pricing
          </h2>
          <p className="text-[var(--groups1-text-secondary)]">Start free. Upgrade as your team scales.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t, i) => {
            const isFeatured = i === 1;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <div className={`rounded-2xl p-[1px] bg-gradient-to-r from-[var(--groups1-primary)] to-[var(--groups1-primary-hover)] transition will-change-transform hover:-translate-y-1 ${isFeatured ? "scale-[1.02]" : ""}`}>
                  <Card
                    variant={isFeatured ? "default" : "groups1"}
                    className={`h-full !rounded-[calc(1rem-1px)] ${isFeatured ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-lg" : ""}`}
                  >
                    <CardHeader variant={isFeatured ? "default" : "groups1"} className="p-4 pb-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className={isFeatured ? "text-[var(--groups1-btn-primary-text)]" : "text-[var(--groups1-text)]"}>
                          {t.name}
                        </CardTitle>
                        {isFeatured && (
                          <span className="rounded-full border border-[var(--groups1-btn-primary-text)]/30 px-2 py-0.5 text-xs font-medium bg-[var(--groups1-btn-primary-text)]/10 text-[var(--groups1-btn-primary-text)]">
                            {t.badge}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent variant={isFeatured ? "default" : "groups1"} className="p-4 space-y-4">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-semibold ${isFeatured ? "text-[var(--groups1-btn-primary-text)]" : "text-[var(--groups1-text)]"}`}>
                          {t.price}
                        </span>
                        <span className={`text-sm ${isFeatured ? "text-[var(--groups1-btn-primary-text)]/85" : "text-[var(--groups1-text-secondary)]"}`}>
                          {t.byline}
                        </span>
                      </div>
                      <ul className={`space-y-2.5 text-sm ${isFeatured ? "text-[var(--groups1-btn-primary-text)]" : "text-[var(--groups1-text)]"}`}>
                        {t.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${isFeatured ? "bg-[var(--groups1-btn-primary-text)]" : "bg-[var(--groups1-primary)]"}`}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link href="/signup">
                        <Button
                          className={`w-full h-10 ${isFeatured ? "bg-[var(--groups1-btn-primary-text)] text-[var(--groups1-primary)] hover:bg-[var(--groups1-btn-primary-text)]/90" : i === 0 ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]" : "border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"}`}
                          variant={isFeatured ? "secondary" : i === 0 ? "default" : "outline"}
                        >
                          {t.cta}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


