import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Settings | BrainScale CRM",
};

export default function EmailSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Email Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Configure email templates and notification settings
        </p>
      </div>
      <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
        Email Settings content placeholder
      </div>
    </div>
  );
}

