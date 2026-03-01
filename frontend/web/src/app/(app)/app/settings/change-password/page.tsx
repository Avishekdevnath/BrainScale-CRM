"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { PasswordStrengthIndicator } from "@/components/password/PasswordStrengthIndicator";
import { useChangePassword } from "@/hooks/usePasswordChange";
import { getPasswordRequirements, validatePassword } from "@/lib/password-utils";
import {
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ShieldAlert,
  LockKeyhole,
} from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const passwordRequirements = React.useMemo(() => getPasswordRequirements(), []);
  const newPasswordValidation = React.useMemo(
    () => validatePassword(newPassword),
    [newPassword]
  );
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword();

  const clearFieldError = (field: "currentPassword" | "newPassword" | "confirmPassword") => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!currentPassword) {
      setErrors({ currentPassword: "Current password is required" });
      return;
    }

    if (!newPasswordValidation.valid) {
      setErrors({ newPassword: newPasswordValidation.errors[0] });
      return;
    }

    if (newPassword === currentPassword) {
      setErrors({ newPassword: "New password must be different from current password" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setTimeout(() => {
        router.push("/app/settings");
      }, 1500);
    } catch {
      // Error handled by hook
    }
  };

  const submitDisabled =
    isChangingPassword ||
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    !newPasswordValidation.valid ||
    !passwordsMatch;

  const strengthVariant = !newPassword
    ? "info"
    : newPasswordValidation.strength === "strong"
      ? "success"
      : newPasswordValidation.strength === "medium"
        ? "warning"
        : "error";

  const strengthLabel = !newPassword
    ? "Not Set"
    : `${newPasswordValidation.strength.charAt(0).toUpperCase()}${newPasswordValidation.strength.slice(1)}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="rounded-xl border border-[var(--groups1-card-border)] bg-[var(--groups1-surface)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-[var(--groups1-card-border)] bg-[var(--groups1-background)] p-2 text-[var(--groups1-primary)]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--groups1-text)] sm:text-xl">
                Change Password
              </h1>
              <StatusBadge variant="info" size="sm">
                Security
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-[var(--groups1-text-secondary)]">
              Update your account password. No email verification is required on this screen.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/settings")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card variant="groups1" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Set a New Password</CardTitle>
              <StatusBadge variant={strengthVariant} size="sm">
                Strength: {strengthLabel}
              </StatusBadge>
            </div>
          </CardHeader>
          <CardContent variant="groups1">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <p className="mt-1 text-xs text-[var(--groups1-text-secondary)]">
                  Enter your current password to confirm this change.
                </p>
                <div className="relative mt-2">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      clearFieldError("currentPassword");
                    }}
                    autoComplete="current-password"
                    className="pr-10"
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--groups1-text-secondary)] transition-colors hover:text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearFieldError("newPassword");
                      if (confirmPassword) clearFieldError("confirmPassword");
                    }}
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--groups1-text-secondary)] transition-colors hover:text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.newPassword}</p>
                )}
                {newPassword && (
                  <div className="mt-3 rounded-lg border border-[var(--groups1-card-border)] bg-[var(--groups1-background)] p-3">
                    <PasswordStrengthIndicator password={newPassword} showRequirements={false} />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    autoComplete="new-password"
                    className="pr-10"
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--groups1-text-secondary)] transition-colors hover:text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <p
                    className={
                      passwordsMatch
                        ? "mt-1 text-xs text-emerald-600 dark:text-emerald-400"
                        : "mt-1 text-xs text-amber-600 dark:text-amber-400"
                    }
                  >
                    {passwordsMatch ? "Passwords match." : "Passwords do not match yet."}
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/app/settings")}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitDisabled}>
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card variant="groups1">
            <CardHeader>
              <CardTitle className="text-sm">Password Checklist</CardTitle>
            </CardHeader>
            <CardContent variant="groups1" className="space-y-3">
              {passwordRequirements.map((item) => {
                const isMet = item.test(newPassword);
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    {isMet ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[var(--groups1-text-secondary)]" />
                    )}
                    <span
                      className={
                        isMet
                          ? "text-xs text-emerald-700 dark:text-emerald-300"
                          : "text-xs text-[var(--groups1-text-secondary)]"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card variant="groups1">
            <CardHeader>
              <CardTitle className="text-sm">Security Notes</CardTitle>
            </CardHeader>
            <CardContent variant="groups1" className="space-y-3">
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--groups1-info)]" />
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Password updates happen immediately after successful confirmation.
                </p>
              </div>
              <div className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--groups1-warning)]" />
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Avoid using old passwords or passwords reused on other services.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
