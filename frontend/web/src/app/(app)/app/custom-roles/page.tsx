import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Roles | BrainScale CRM",
};

export default function CustomRolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Custom Roles</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Create and manage custom roles for your workspace
        </p>
      </div>
      <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
        Custom Roles content placeholder
      </div>
    </div>
  );
}

