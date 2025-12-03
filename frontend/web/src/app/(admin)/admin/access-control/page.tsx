import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Access Control | BrainScale CRM",
};

export default function AdminAccessControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Access Control</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Manage permissions and access levels
        </p>
      </div>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Permission Settings</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <div className="h-64 flex items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
            Access control interface placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

