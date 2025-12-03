export function MetricsBar() {
  const metrics = [
    { label: "Teams", value: "120+" },
    { label: "Calls Logged", value: "1.2M" },
    { label: "Follow-ups", value: "860k" },
    { label: "Avg. CSAT", value: "4.8/5" },
  ];
  return (
    <section className="rounded-2xl section-alt p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-2xl font-semibold">{m.value}</div>
            <div className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


