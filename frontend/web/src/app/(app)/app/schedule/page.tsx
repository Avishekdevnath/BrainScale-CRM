import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";

export default function SchedulePage() {
  return (
    <main className="space-y-6 bg-gradient-to-b from-slate-50 to-white p-6">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Team Duty Schedule</h1>
        <p className="mt-1 text-sm text-slate-600">
          Weekly recurring schedule for all active batches.
        </p>
      </section>
      <ScheduleGrid />
    </main>
  );
}
