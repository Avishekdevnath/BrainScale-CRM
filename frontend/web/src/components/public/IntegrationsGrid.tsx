import { Card, CardContent } from "@/components/ui/card";
import { Slack, Mail, Database, Zap, Globe, Phone, FileSpreadsheet, Webhook } from "lucide-react";

const integrations = [
  { name: "Slack", icon: Slack, status: "live" },
  { name: "Email", icon: Mail, status: "live" },
  { name: "PostgreSQL", icon: Database, status: "live" },
  { name: "Zapier", icon: Zap, status: "live" },
  { name: "REST API", icon: Globe, status: "live" },
  { name: "VoIP", icon: Phone, status: "live" },
  { name: "Google Sheets", icon: FileSpreadsheet, status: "soon" },
  { name: "Webhooks", icon: Webhook, status: "live" },
];

export function IntegrationsGrid() {
  return (
    <section>
      <div className="mb-12 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] px-3 py-1 text-xs font-medium text-[var(--groups1-text-secondary)]">
          Integrations
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--groups1-text)] sm:text-4xl">
          Connects with your stack
        </h2>
        <p className="text-lg text-[var(--groups1-text-secondary)]">
          Drop into your existing workflow without rebuilding anything.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {integrations.map(({ name, icon: Icon, status }) => (
          <Card
            key={name}
            variant="groups1"
            className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <CardContent variant="groups1" className="relative flex flex-col items-center gap-3 py-5">
              {status === "soon" && (
                <div className="absolute right-2 top-2 rounded-full bg-[var(--groups1-secondary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                  Soon
                </div>
              )}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--groups1-primary)]/12">
                <Icon className="h-6 w-6 text-[var(--groups1-primary)]" />
              </div>
              <div className="text-sm font-medium text-[var(--groups1-text)]">{name}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-[var(--groups1-text-secondary)]">
        All integrations available via our{" "}
        <a href="/features" className="font-medium text-[var(--groups1-primary)] hover:underline">
          public REST API
        </a>
        .
      </p>
    </section>
  );
}
