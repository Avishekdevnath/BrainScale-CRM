import { Users2, Shield, FileText, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeatureGrid() {
  const features = [
    { title: "Role-based permissions", desc: "Granular access by role, group, and workspace.", icon: Shield },
    { title: "Team pipelines", desc: "Coordinate stages, SLAs, and handoffs across teams.", icon: Users2 },
    { title: "Email templates", desc: "Standardize outreach with shared, versioned templates.", icon: FileText },
    { title: "Audit logs", desc: "Trace critical actions for compliance and reviews.", icon: Lock },
  ];
  return (
    <section className="section-alt p-6 sm:p-8">
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {features.map(({ title, desc, icon: Icon }) => (
        <div
          key={title}
          className="rounded-2xl bg-[color-mix(in_oklab,var(--muted) 40%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted) 15%,transparent)] p-[1px] transition hover:-translate-y-1"
        >
          <Card className="h-full rounded-[calc(theme(borderRadius.2xl)-1px)]">
            <CardHeader className="flex items-center gap-3 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle className="m-0">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{desc}</p>
            </CardContent>
          </Card>
        </div>
      ))}
      </div>
    </section>
  );
}


