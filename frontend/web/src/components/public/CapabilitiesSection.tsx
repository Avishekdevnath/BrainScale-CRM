import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneCall, Users2, Upload, BarChart3 } from "lucide-react";

export function CapabilitiesSection() {
  const items = [
    {
      title: "Students & Calls",
      desc: "Search by phone/email and log calls in seconds.",
      icon: PhoneCall,
    },
    {
      title: "Follow-ups",
      desc: "Due dates, ownership, and reminders that keep leads warm.",
      icon: Users2,
    },
    {
      title: "Imports",
      desc: "CSV/XLSX mapping with duplicate detection.",
      icon: Upload,
    },
    {
      title: "Dashboards",
      desc: "KPIs, trends, distributions, and scoped filters.",
      icon: BarChart3,
    },
  ];

  return (
    <section>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--groups1-text)]">
          Essential capabilities
        </h2>
        <p className="text-[var(--groups1-text-secondary)]">Everything you need to run outreach at speed.</p>
      </div>
      <div className="mt-10 grid auto-rows-[1fr] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map(({ title, desc, icon: Icon }) => (
          <Card key={title} variant="groups1" className="relative overflow-hidden h-full transition will-change-transform hover:-translate-y-1">
            <div className="relative z-10 p-4 pb-3 h-full flex flex-col">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <CardTitle className="m-0 text-base text-[var(--groups1-text)]">{title}</CardTitle>
              </div>
              <div className="mt-2 text-sm text-[var(--groups1-text-secondary)]">
                <p>{desc}</p>
              </div>
              <div className="mt-auto" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}


