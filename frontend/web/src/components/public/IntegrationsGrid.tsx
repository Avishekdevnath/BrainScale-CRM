import { Card, CardContent } from "@/components/ui/card";
import { Slack, Mail, Database, Zap } from "lucide-react";

const items = [
  { name: "Slack", icon: Slack },
  { name: "Email", icon: Mail },
  { name: "Postgres", icon: Database },
  { name: "Zapier", icon: Zap },
];

export function IntegrationsGrid() {
  return (
    <section className="w-full">
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--groups1-text)]">
            Integrations
          </h2>
          <p className="text-[var(--groups1-text-secondary)]">Connect your stack in minutes.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {items.map(({ name, icon: Icon }) => (
            <Card key={name} variant="groups1" className="transition will-change-transform hover:-translate-y-1">
              <CardContent variant="groups1" className="py-6 flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium text-[var(--groups1-text)]">{name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}


