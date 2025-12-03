"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { Lock, User, Mail } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Configure your account and preferences
        </p>
      </div>

      {/* Account Information */}
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">
                {user?.name || "No name set"}
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">Name</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">
                {user?.email || "No email"}
              </p>
              <p className="text-xs text-[var(--groups1-text-secondary)]">Email</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--groups1-text)]">Password</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Change your account password
                </p>
              </div>
            </div>
            <Link href="/app/settings/change-password">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

