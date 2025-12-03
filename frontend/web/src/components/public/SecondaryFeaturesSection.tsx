import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const items = [
  { title: "Role-based Access", desc: "Custom roles and permissions per workspace." },
  { title: "Group Scoping", desc: "Restrict visibility and actions by groups." },
  { title: "Exports", desc: "CSV/XLSX/PDF exports with filters." },
  { title: "Rate Limiting", desc: "Security hardened for auth and uploads." },
  { title: "Email Digests", desc: "Daily/weekly follow-up summaries." },
  { title: "Auditing", desc: "Keep a trail of sensitive operations." },
];

export function SecondaryFeaturesSection() {
  return (
    <section className="section-alt min-h-[70vh] p-6 sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gradient">Everything you need</h2>
        <p className="text-[hsl(var(--muted-foreground))]">Powerful features baked in for teams of any size.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title} className="h-full">
            <CardHeader>
              <CardTitle>{it.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{it.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}


