import type { Metadata } from "next";
import { IntegrationsGrid } from "@/components/public/IntegrationsGrid";

export const metadata: Metadata = {
  title: "Integrations | BrainScale CRM",
};

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-0 space-y-0">
      {/* Page header - integrations specific */}
      <section className="pt-10 pb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Connect your stack</h1>
        <p className="mt-2 text-[hsl(var(--muted-foreground))]">Use native connectors and automations to sync data where it belongs.</p>
      </section>

      {/* Integrations grid */}
      <section className="py-8">
        <IntegrationsGrid />
      </section>

      {/* How it works */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">How it works</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Three steps to connect any tool.</p>
        </div>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: 1, t: "Choose connector", d: "Pick Slack, email, databases, or automation tools." },
            { n: 2, t: "Authorize", d: "Grant least-privilege access and scope as needed." },
            { n: 3, t: "Sync & automate", d: "Map fields, schedule syncs, and trigger workflows." },
          ].map(({ n, t, d }) => (
            <li key={t} className="rounded-xl border ring-1 ring-[hsl(var(--border))]/60 bg-white/90 dark:bg-black/30 p-5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white text-xs flex items-center justify-center">{n}</div>
              <div className="mt-3 font-medium">{t}</div>
              <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))] dark:text-white/85">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Featured connectors */}
      <section className="py-10">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Featured connectors</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Popular integrations ready in minutes.</p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Slack", "Gmail", "Postgres", "Zapier"].map((name) => (
            <div key={name} className="rounded-2xl p-[1px] bg-gradient-to-br from-[hsl(var(--primary)_/_0.45)] to-[hsl(var(--accent)_/_0.35)]">
              <div className="rounded-[calc(theme(borderRadius.2xl)-1px)] bg-white/90 dark:bg-black/30 ring-1 ring-[hsl(var(--border))]/60 p-5 text-center font-medium">{name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Developer callout */}
      <section className="py-10">
        <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
          <div className="rounded-[calc(theme(borderRadius.2xl)-1px)] bg-white/90 dark:bg-black/30 ring-1 ring-[hsl(var(--border))]/60 p-6 text-center">
            <h4 className="text-lg font-semibold">Developers</h4>
            <p className="mt-1 text-[hsl(var(--muted-foreground))]">Use our API & webhooks to build custom automations.</p>
          </div>
        </div>
      </section>

      {/* Integration FAQs */}
      <section className="pt-6 pb-14">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">Integration FAQs</h3>
          <p className="text-[hsl(var(--muted-foreground))]">Quick answers for getting set up.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: "Do you support OAuth?", a: "Yes — connectors use secure OAuth where available." },
            { q: "How often do syncs run?", a: "On demand or scheduled (15m to daily)." },
            { q: "Is field mapping flexible?", a: "Yes — custom mappings per connector." },
            { q: "Can I build custom connectors?", a: "Use our API & webhooks for bespoke workflows." },
          ].map((f) => (
            <details key={f.q} className="rounded-md border border-[hsl(var(--border))] p-4 bg-white/30 dark:bg-white/5">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}


