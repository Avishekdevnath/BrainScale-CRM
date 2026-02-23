export function MetricsBar() {
  const metrics = [
    { value: "120+", label: "Teams worldwide" },
    { value: "1.2M+", label: "Calls logged" },
    { value: "860k+", label: "Follow-ups tracked" },
    { value: "4.8/5", label: "Avg. satisfaction" },
  ];

  return (
    <section className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-6 sm:p-8">
      <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-[var(--groups1-text-secondary)]">
        Trusted by fast-moving teams
      </p>
      <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={i < metrics.length - 1 ? "sm:border-r sm:border-[var(--groups1-border)]" : ""}
          >
            <div
              className="text-3xl font-bold sm:text-4xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--groups1-primary) 0%, var(--color-teal-300) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {m.value}
            </div>
            <div className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[var(--groups1-text-secondary)]">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
