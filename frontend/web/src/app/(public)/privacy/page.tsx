import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | BrainScale CRM",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">This is a placeholder privacy policy.</p>
    </div>
  );
}


