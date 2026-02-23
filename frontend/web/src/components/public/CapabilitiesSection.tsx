import { Card } from "@/components/ui/card";
import { PhoneCall, Clock, Users2, Upload, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: PhoneCall,
    title: "Call Logging",
    desc: "Log calls in seconds with outcome tagging, notes, and auto-timestamping. Search by phone, email, or student name instantly.",
    bgColor: "bg-[var(--color-bg-1)]",
    iconColor: "text-blue-500",
  },
  {
    icon: Clock,
    title: "Follow-up Engine",
    desc: "Set due dates, assign ownership, and get reminders that keep leads warm. Never let a callback slip through the cracks again.",
    bgColor: "bg-[var(--color-bg-3)]",
    iconColor: "text-[var(--groups1-primary)]",
  },
  {
    icon: Users2,
    title: "Team Workspaces",
    desc: "Multi-tenant by design. Invite unlimited members, organize into groups and batches, and scope access per workspace.",
    bgColor: "bg-[var(--color-bg-5)]",
    iconColor: "text-purple-500",
  },
  {
    icon: Upload,
    title: "Smart Imports",
    desc: "Upload CSV or XLSX files with intelligent column mapping, duplicate detection, and one-click rollback support.",
    bgColor: "bg-[var(--color-bg-2)]",
    iconColor: "text-yellow-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & KPIs",
    desc: "Track call volume, conversion rates, and follow-up performance. Scoped dashboards per member, group, or batch.",
    bgColor: "bg-[var(--color-bg-8)]",
    iconColor: "text-[var(--groups1-primary)]",
  },
  {
    icon: Shield,
    title: "Roles & Permissions",
    desc: "Define granular custom roles per workspace. Control exactly who can view, edit, or manage each feature and data type.",
    bgColor: "bg-[var(--color-bg-4)]",
    iconColor: "text-red-500",
  },
];

export function CapabilitiesSection() {
  return (
    <section>
      <div className="mb-12 space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-secondary)] px-3 py-1 text-xs font-medium text-[var(--groups1-text-secondary)]">
          Features
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--groups1-text)] sm:text-4xl">
          Everything your team needs
        </h2>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-[var(--groups1-text-secondary)]">
          Built for outbound sales, education enrollment, and support teams that live on the phone.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, desc, icon: Icon, bgColor, iconColor }) => (
          <Card
            key={title}
            variant="groups1"
            className="group relative h-full overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex h-full flex-col gap-4 p-6">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgColor}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--groups1-text)]">{title}</h3>
                <p className="text-sm leading-relaxed text-[var(--groups1-text-secondary)]">{desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
