"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, SlidersHorizontal } from "lucide-react";
import { usePlatformUsage, usePlatformUsageSettings } from "@/hooks/usePlatform";
import NudgeDialog, { NudgeTarget } from "@/components/platform/usage/NudgeDialog";
import UsageSettingsDialog from "@/components/platform/usage/UsageSettingsDialog";

function formatMinutes(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function PlatformUsagePage() {
  const [windowDays, setWindowDays] = useState<number | undefined>(undefined); // undefined => settings default
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nudgeTargets, setNudgeTargets] = useState<NudgeTarget[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data, isLoading, error, mutate } = usePlatformUsage({ windowDays, lowOnly: lowOnly || undefined, page, size: 50 });
  const { data: settingsData, mutate: mutateSettings } = usePlatformUsageSettings();

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  const selectLowUsage = () => {
    setSelected(new Set(items.filter((i) => i.isLowUsage && !i.inCooldown).map((i) => i.id)));
  };

  const selectedTargets = useMemo<NudgeTarget[]>(
    () => items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id, email: i.email, name: i.name, inCooldown: i.inCooldown })),
    [items, selected],
  );

  const defaults = settingsData?.defaults ?? { subject: "", body: "" };
  const settings = data?.settings ?? settingsData?.settings;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  const afterSent = () => {
    setSelected(new Set());
    mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-[var(--groups1-text)]">Usage</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={windowDays ?? ""}
            onChange={(e) => { setWindowDays(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className="text-sm px-2 py-1.5 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-[var(--groups1-text)] outline-none"
          >
            <option value="">Default window{settings ? ` (${settings.windowDays}d)` : ""}</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-[var(--groups1-text-secondary)] cursor-pointer">
            <input type="checkbox" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
            Low usage only
          </label>
          <button
            type="button"
            onClick={selectLowUsage}
            className="text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-[var(--groups1-border)] rounded-lg px-2 py-1.5"
          >
            Select all low usage
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] border border-[var(--groups1-border)] rounded-lg px-2 py-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Settings
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setNudgeTargets(selectedTargets)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[var(--groups1-primary)] rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" /> Send nudge ({selected.size})
          </button>
        </div>
      </div>

      {settings && (
        <p className="text-xs text-[var(--groups1-text-secondary)]">
          Low usage = under {settings.thresholdMinutes} min in {data?.windowDays ?? settings.windowDays} days · nudge cooldown {settings.cooldownDays} days
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--groups1-text-secondary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-500">Failed to load usage.</p>}
      {data && items.length === 0 && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">No users found.</p>
      )}

      {data && items.length > 0 && (
        <div className="rounded-xl border border-[var(--groups1-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Active time</th>
                <th className="px-4 py-2 font-medium">Last active</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last nudged</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-[var(--groups1-border)]">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-[var(--groups1-text)]">{u.name || "—"}</div>
                    <div className="text-xs text-[var(--groups1-text-secondary)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-2 text-[var(--groups1-text)]">{formatMinutes(u.activeMinutes)}</td>
                  <td className="px-4 py-2 text-[var(--groups1-text-secondary)]">{u.lastActiveDate ?? "—"}</td>
                  <td className="px-4 py-2">
                    {u.isLowUsage ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                        Low usage
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--groups1-text-secondary)]">
                    {formatDate(u.lastNudgedAt)}
                    {u.inCooldown && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[var(--groups1-secondary)]">cooldown</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setNudgeTargets([{ id: u.id, email: u.email, name: u.name, inCooldown: u.inCooldown }])}
                      className="text-xs text-[var(--groups1-primary)] hover:underline border border-[var(--groups1-border)] rounded-lg px-2 py-1"
                    >
                      Nudge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-[var(--groups1-text-secondary)]">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border border-[var(--groups1-border)] rounded-lg px-2 py-1 disabled:opacity-50">
            Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="border border-[var(--groups1-border)] rounded-lg px-2 py-1 disabled:opacity-50">
            Next
          </button>
        </div>
      )}

      <NudgeDialog
        open={nudgeTargets !== null}
        onClose={() => setNudgeTargets(null)}
        targets={nudgeTargets ?? []}
        defaults={defaults}
        onSent={afterSent}
      />
      {settings && (
        <UsageSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSaved={() => { mutateSettings(); mutate(); }}
        />
      )}
    </div>
  );
}
