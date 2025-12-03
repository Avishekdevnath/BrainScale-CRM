import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Users | BrainScale CRM",
};

const users = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "Admin", status: "active" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User", status: "active" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "User", status: "inactive" },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">User Management</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Manage system users and permissions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
          <Input
            type="text"
            placeholder="Search users..."
            className="pl-10 bg-[var(--groups1-surface)] border-[var(--groups1-border)]"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase border-b border-[var(--groups1-card-border-inner)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                      {user.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--groups1-text)] border-b border-[var(--groups1-card-border-inner)]">
                      {user.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

