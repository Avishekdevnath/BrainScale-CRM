"use client";

import { Loader2, Building2, Users, GraduationCap, ListChecks, PhoneCall } from "lucide-react";
import { usePlatformOverview } from "@/hooks/usePlatform";

const cards = [
  { key: "workspaces", label: "Workspaces", icon: Building2 },
  { key: "members", label: "Members", icon: Users },
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "callLists", label: "Call Lists", icon: ListChecks },
  { key: "callLogs", label: "Call Logs", icon: PhoneCall },
] as const;

export default function PlatformOverviewPage() {
  const { data, isLoading, error } = usePlatformOverview();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">Overview</h1>

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load overview.</p>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {cards.map((c) => (
            <div
              key={c.key}
              className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4"
            >
              <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-xs">
                <c.icon className="w-4 h-4" />
                {c.label}
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--groups1-text)]">
                {data[c.key]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
