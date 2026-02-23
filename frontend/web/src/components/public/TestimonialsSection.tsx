import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Nadia Rahman",
    role: "Operations Lead",
    company: "EduReach",
    quote:
      "BrainScale CRM streamlined our follow-up process and boosted enrollment conversion by 22% in the first month.",
    initials: "NR",
  },
  {
    name: "Arun Patel",
    role: "Sales Manager",
    company: "CallForce",
    quote:
      "The CSV import with duplicate detection saved us days of manual work. Setup literally took 10 minutes.",
    initials: "AP",
  },
  {
    name: "Maya Chen",
    role: "Founder",
    company: "Skillpath",
    quote:
      "Finally a CRM that our team actually wants to open. The dashboards keep everyone accountable without micromanaging.",
    initials: "MC",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section>
      <div className="mb-12 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] px-3 py-1 text-xs font-medium text-[var(--groups1-text-secondary)]">
          Testimonials
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--groups1-text)] sm:text-4xl">
          Loved by growing teams
        </h2>
        <p className="text-lg text-[var(--groups1-text-secondary)]">
          Hear from teams that ship with BrainScale CRM every day.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <Card
            key={t.name}
            variant="groups1"
            className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <CardContent variant="groups1" className="flex h-full flex-col gap-4 p-6">
              <StarRating />
              <p className="flex-1 text-sm leading-relaxed text-[var(--groups1-text)]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-[var(--groups1-card-border)] pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--groups1-primary)] text-sm font-bold text-[var(--groups1-btn-primary-text)]">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--groups1-text)]">{t.name}</div>
                  <div className="text-xs text-[var(--groups1-text-secondary)]">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
