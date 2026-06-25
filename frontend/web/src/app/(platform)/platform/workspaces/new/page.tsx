"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Copy } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [callSystemV2, setCallSystemV2] = useState(true);
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">("existing");
  const [email, setEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters");
    if (!email.trim()) return toast.error("Owner email required");
    if (ownerMode === "new" && !ownerName.trim()) return toast.error("Owner name required");

    setSubmitting(true);
    try {
      const owner =
        ownerMode === "existing"
          ? ({ mode: "existing", email } as const)
          : ({ mode: "new", email, name: ownerName } as const);
      const res = await apiClient.platformCreateWorkspace({ name, plan, callSystemV2, owner });
      toast.success("Workspace created");
      if (res.tempPassword) {
        setTempPassword(res.tempPassword);
      } else {
        router.push(`/platform/workspaces/${res.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  if (tempPassword) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-bold text-[var(--groups1-text)]">Workspace created</h1>
        <div className="rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 space-y-2">
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Temporary password for the new owner ({email}). Store it now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--groups1-secondary)] text-[var(--groups1-text)] text-sm break-all">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Copied"); }}
              className="p-2 rounded-lg border border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]"
            >
              <Copy className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
            </button>
          </div>
        </div>
        <Link
          href="/platform/workspaces"
          className="inline-flex text-sm font-semibold px-3 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
        >
          Done
        </Link>
      </div>
    );
  }

  const field = "w-full px-3 py-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] text-sm text-[var(--groups1-text)] outline-none";

  return (
    <div className="max-w-md space-y-4">
      <Link href="/platform/workspaces" className="inline-flex items-center gap-1 text-sm text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-xl font-bold text-[var(--groups1-text)]">Create workspace</h1>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--groups1-text-secondary)]">Workspace name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className="text-xs text-[var(--groups1-text-secondary)]">Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={field}>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="BUSINESS">BUSINESS</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--groups1-text)]">
          <input type="checkbox" checked={callSystemV2} onChange={(e) => setCallSystemV2(e.target.checked)} />
          Enable Call System v2
        </label>

        <div className="pt-2 border-t border-[var(--groups1-border)]">
          <label className="text-xs text-[var(--groups1-text-secondary)]">Owner</label>
          <div className="flex gap-2 my-2">
            {(["existing", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOwnerMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs ${
                  ownerMode === m
                    ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                    : "border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]"
                }`}
              >
                {m === "existing" ? "Existing user" : "New user"}
              </button>
            ))}
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@email.com"
            className={field}
          />
          {ownerMode === "new" && (
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner name"
              className={`${field} mt-2`}
            />
          )}
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Create
        </button>
      </div>
    </div>
  );
}
