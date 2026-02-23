"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Starter plan is completely free, forever. No credit card required.",
  },
  {
    q: "Can I import my existing data?",
    a: "Yes. CSV/XLSX imports with column mapping and duplicate detection are built-in on all plans.",
  },
  {
    q: "Is email verification required?",
    a: "Yes. It helps us keep your account and team data secure.",
  },
  {
    q: "How many users are included?",
    a: "Starter includes up to 3 users. Team supports up to 15, and Business is unlimited.",
  },
  {
    q: "Do you support multiple workspaces?",
    a: "Yes. Create separate workspaces for different teams or clients and switch between them easily.",
  },
  {
    q: "What file size can I import?",
    a: "Up to 10MB per file on Starter. Larger limits available on Team (25MB) and Business (unlimited).",
  },
  {
    q: "Can I set custom roles and permissions?",
    a: "Yes. Define custom roles per workspace and scope access down to individual features and groups.",
  },
  {
    q: "Can I export my data?",
    a: "Any time. Export to CSV, XLSX, or PDF. Your data always belongs to you.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-12 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] px-3 py-1 text-xs font-medium text-[var(--groups1-text-secondary)]">
          FAQ
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--groups1-text)] sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="text-lg text-[var(--groups1-text-secondary)]">
          Everything you need to know before getting started.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-2">
        {faqs.map((faq) => {
          const isOpen = open === faq.q;
          return (
            <div
              key={faq.q}
              className="overflow-hidden rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)]"
            >
              <button
                onClick={() => setOpen(isOpen ? null : faq.q)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-[var(--groups1-text)] transition hover:bg-[var(--groups1-secondary)]"
              >
                <span className="text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[var(--groups1-text-secondary)] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? "max-h-48" : "max-h-0"
                }`}
              >
                <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--groups1-text-secondary)]">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
