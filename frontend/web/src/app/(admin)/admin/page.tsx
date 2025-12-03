import type { Metadata } from "next";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Dashboard | BrainScale CRM",
};

const adminKPIs = [
  { label: "Total Users", value: "1,234", trend: { value: "+45", type: "positive" as const } },
  { label: "Workspaces", value: "89", trend: { value: "+3", type: "positive" as const } },
  { label: "Active Sessions", value: "342", trend: { value: "+12", type: "positive" as const } },
  { label: "System Health", value: "98.5%", trend: { value: "+0.5%", type: "positive" as const } },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Admin Dashboard</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          System-wide overview and management
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminKPIs.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
          />
        ))}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>System Activity</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
              Activity chart placeholder
            </div>
          </CardContent>
        </Card>
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent variant="groups1">
            <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
              Events list placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

