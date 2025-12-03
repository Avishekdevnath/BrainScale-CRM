import { Card } from "@/components/ui/card";

export function FAQSection() {
  const faqs = [
    { q: "Do I need a credit card to start?", a: "No. The Starter plan is free." },
    { q: "Can I import my existing data?", a: "Yes. CSV/XLSX imports with column mapping are built-in." },
    { q: "Is email verification required?", a: "Yes. It helps us keep your account secure." },
    { q: "How many users are included?", a: "Invite unlimited users. Pricing applies per active member on paid tiers." },
    { q: "Do you support multiple workspaces?", a: "Yes. Create separate workspaces and switch between them from the topbar." },
    { q: "What file size can I import?", a: "Up to 10MB per file by default. Larger limits are available on Team & Business." },
    { q: "Can I set custom roles and permissions?", a: "Yes. Define custom roles per workspace and scope access by groups." },
    { q: "Can I export my data?", a: "Any time. Export students, calls, and follow-ups to CSV/XLSX. PDFs available for reports." },
    { q: "What support is included?", a: "Email support for all plans. Priority support and onboarding for Business." },
  ];
  return (
    <section>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--groups1-text)]">
          Frequently asked questions
        </h2>
        <p className="text-[var(--groups1-text-secondary)]">Everything you need to know to get started.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((f) => (
          <Card key={f.q} variant="groups1" className="transition will-change-transform hover:-translate-y-0.5">
            <details className="group">
              <summary className="cursor-pointer list-none p-4 font-medium text-[var(--groups1-text)]">
                {f.q}
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm text-[var(--groups1-text-secondary)]">{f.a}</p>
              </div>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}


