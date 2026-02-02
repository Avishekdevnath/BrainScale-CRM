import type { Metadata } from "next";
import { WorkspaceSettingsClient } from "@/components/workspace/WorkspaceSettingsClient";

export const metadata: Metadata = {
  title: "Workspace Settings | BrainScale CRM",
};

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Workspace Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Configure workspace preferences and settings
        </p>
      </div>

      <WorkspaceSettingsClient />
    </div>
  );
}

