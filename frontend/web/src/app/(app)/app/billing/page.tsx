import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | BrainScale CRM",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Plan & Billing</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Manage your subscription plan and billing information
        </p>
      </div>
      <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
        Plan & Billing content placeholder
      </div>
    </div>
  );
}

