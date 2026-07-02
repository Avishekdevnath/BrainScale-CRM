"use client";

import { useEffect, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface UsageSettings {
  thresholdMinutes: number;
  windowDays: number;
  cooldownDays: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: UsageSettings;
  onSaved: () => void;
}

export default function UsageSettingsDialog({ open, onClose, settings, onSaved }: Props) {
  const [threshold, setThreshold] = useState(String(settings.thresholdMinutes));
  const [window_, setWindow] = useState(String(settings.windowDays));
  const [cooldown, setCooldown] = useState(String(settings.cooldownDays));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setThreshold(String(settings.thresholdMinutes));
      setWindow(String(settings.windowDays));
      setCooldown(String(settings.cooldownDays));
    }
  }, [open, settings]);

  if (!open) return null;

  const nums = {
    thresholdMinutes: parseInt(threshold, 10),
    windowDays: parseInt(window_, 10),
    cooldownDays: parseInt(cooldown, 10),
  };
  const valid = Object.values(nums).every((n) => Number.isInteger(n) && n >= 1);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.platformUpdateUsageSettings(nums);
      toast.success("Settings saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--groups1-text-secondary)]">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[var(--groups1-primary)]" />
          <h2 className="text-sm font-bold text-[var(--groups1-text)]">Usage nudge settings</h2>
        </div>

        {field("Low-usage threshold (minutes per window)", threshold, setThreshold)}
        {field("Window (days)", window_, setWindow)}
        {field("Nudge cooldown (days)", cooldown, setCooldown)}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-sm text-[var(--groups1-text-secondary)] px-3 py-2">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !valid}
            onClick={save}
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg text-white bg-[var(--groups1-primary)] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
