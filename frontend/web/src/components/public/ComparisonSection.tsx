import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const rows = [
  { feature: "Search by phone/email", spreadsheets: "Manual", smartcrm: "Instant" },
  { feature: "Call logging & history", spreadsheets: "Workarounds", smartcrm: "Built-in" },
  { feature: "Follow-ups & reminders", spreadsheets: "No", smartcrm: "Yes" },
  { feature: "Imports with mapping", spreadsheets: "Manual", smartcrm: "Assisted" },
  { feature: "Role-based access", spreadsheets: "No", smartcrm: "Yes" },
];

export function ComparisonSection() {
  return (
    <section className="section-alt min-h-[70vh] p-6 sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gradient">Why BrainScale CRM over spreadsheets</h2>
        <p className="text-[hsl(var(--muted-foreground))]">Purpose-built workflows that save time and prevent errors.</p>
      </div>
      <Card className="mt-8 overflow-hidden">
        <CardHeader>
          <CardTitle>Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 text-sm">
            <div className="border-b border-[hsl(var(--border))] px-4 py-3 font-medium">Feature</div>
            <div className="border-b border-[hsl(var(--border))] px-4 py-3 font-medium">Spreadsheets</div>
            <div className="border-b border-[hsl(var(--border))] px-4 py-3 font-medium">BrainScale CRM</div>
            {rows.map((r) => (
              <React.Fragment key={r.feature}>
                <div className="border-b border-[hsl(var(--border))] px-4 py-3">{r.feature}</div>
                <div className="border-b border-[hsl(var(--border))] px-4 py-3 text-[hsl(var(--muted-foreground))]">
                  {r.spreadsheets}
                </div>
                <div className="border-b border-[hsl(var(--border))] px-4 py-3">{r.smartcrm}</div>
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}


