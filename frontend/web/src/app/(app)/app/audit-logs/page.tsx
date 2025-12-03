import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs | BrainScale CRM",
};

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Audit Logs</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          View system activity and audit trail
        </p>
      </div>
      <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)] rounded-lg bg-[var(--groups1-surface)]">
        Audit Logs content placeholder
      </div>
    </div>
  );
}

