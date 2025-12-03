import type { Metadata } from "next";
import { CapabilitiesSection } from "@/components/public/CapabilitiesSection";
import { FeatureGrid } from "@/components/public/FeatureGrid";

export const metadata: Metadata = {
  title: "Features | BrainScale CRM",
};

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-0 space-y-0">
      {/* Page header - distinct from home */}
      <section className="pt-10 pb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">All the features you need</h1>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">Build reliable outreach workflows, keep data clean, and scale with confidence.</p>
      </section>

      {/* Core capabilities */}
      <section className="py-10">
        <CapabilitiesSection />
      </section>

      {/* Detailed feature grid */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Advanced features</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Controls and capabilities for growing teams.</p>
        </div>
        <div className="mt-8">
          <FeatureGrid />
        </div>
      </section>

      {/* Use cases */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Use cases</h3>
          <p className="text-[hsl(var(--muted-foreground))]">How teams put BrainScale CRM to work.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[{
            title: "Admissions outreach",
            desc: "Qualify leads, track follow-ups, and maintain contact history across channels.",
          }, {
            title: "Sales ops",
            desc: "Centralize pipelines, enforce SLAs, and get visibility on team performance.",
          }, {
            title: "Support & success",
            desc: "Log calls, triage requests, and automate next steps for faster resolutions.",
          }].map(({ title, desc }) => (
            <div key={title} className="rounded-2xl p-[1px] bg-gradient-to-r from-[hsl(var(--primary)_/_0.45)] to-[hsl(var(--accent)_/_0.35)]">
              <div className="rounded-[calc(theme(borderRadius.2xl)-1px)] bg-white/90 dark:bg-black/30 ring-1 ring-[hsl(var(--border))]/60 p-5">
                <div className="text-base font-medium">{title}</div>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] dark:text-white/85">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Typical workflow</h3>
          <p className="text-[hsl(var(--muted-foreground))]">From import to insights in a few steps.</p>
        </div>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: 1, t: "Import & dedupe", d: "Bring CSV/XLSX, map columns, and detect duplicates automatically." },
            { n: 2, t: "Engage & follow up", d: "Call, email, and assign owners with reminders and due dates." },
            { n: 3, t: "Report & optimize", d: "Track KPIs, trends, and distributions to improve outcomes." },
          ].map(({ n, t, d }) => (
            <li key={t} className="rounded-xl border ring-1 ring-[hsl(var(--border))]/60 bg-white/90 dark:bg-black/30 p-5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white text-xs flex items-center justify-center">{n}</div>
              <div className="mt-3 font-medium">{t}</div>
              <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))] dark:text-white/85">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Security & compliance */}
      <section className="py-12">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Security & compliance</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Enterprise-grade controls from day one.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <ul className="space-y-2">
            <li>• At-rest and in-transit encryption</li>
            <li>• Role-based access control</li>
            <li>• Audit logs and export</li>
          </ul>
          <ul className="space-y-2">
            <li>• SSO/SAML (Business)</li>
            <li>• Data residency options</li>
            <li>• Regular backups</li>
          </ul>
        </div>
      </section>
    </div>
  );
}


