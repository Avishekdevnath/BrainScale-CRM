import type { Metadata } from "next";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Workspaces | BrainScale CRM",
};

const workspaces = [
  { id: "1", name: "DreamEd Academy", users: 45, status: "active" },
  { id: "2", name: "Nova Institute", users: 32, status: "active" },
  { id: "3", name: "Tech Academy", users: 28, status: "inactive" },
];

export default function AdminWorkspacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Workspace Management</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Manage all workspaces in the system
        </p>
      </div>

      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>All Workspaces</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="flex items-center justify-between p-4 bg-[var(--groups1-background)] rounded-lg border border-[var(--groups1-card-border)]"
              >
                <div>
                  <h3 className="font-semibold text-[var(--groups1-text)]">{workspace.name}</h3>
                  <p className="text-sm text-[var(--groups1-text-secondary)]">
                    {workspace.users} users
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">
                  {workspace.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

