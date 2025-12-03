import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  { name: "Nadia, Ops Lead", quote: "BrainScale CRM streamlined our follow-ups and boosted conversion by 22%." },
  { name: "Arun, Sales Manager", quote: "The imports and call histories saved days of manual work." },
  { name: "Maya, Founder", quote: "Setup took minutes. The dashboards keep our team on track." },
];

export function TestimonialsSection() {
  return (
    <section className="section-alt p-6 sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gradient">What customers say</h2>
        <p className="text-[hsl(var(--muted-foreground))]">Social proof from teams using BrainScale CRM daily.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card key={t.name} className="h-full">
            <CardContent className="pt-5">
              <p className="text-sm leading-relaxed">“{t.quote}”</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                {t.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}


