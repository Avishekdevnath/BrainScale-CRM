import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";

export const metadata: Metadata = {
  title: "Admin Monitoring | BrainScale CRM",
};

const monitoringKPIs = [
  { label: "Server Uptime", value: "99.9%", trend: { value: "Stable", type: "neutral" as const } },
  { label: "API Response", value: "145ms", trend: { value: "-5ms", type: "positive" as const } },
  { label: "Error Rate", value: "0.02%", trend: { value: "-0.01%", type: "positive" as const } },
  { label: "Active Connections", value: "1,234", trend: { value: "+56", type: "positive" as const } },
];

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">System Monitoring</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Real-time system health and performance metrics
        </p>
      </div>

      {/* Monitoring KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {monitoringKPIs.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* Monitoring Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
              Performance chart placeholder
            </div>
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Error Logs</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
              Error logs placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

