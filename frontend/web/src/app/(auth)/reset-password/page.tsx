"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/password/OtpInput";
import { PasswordStrengthIndicator } from "@/components/password/PasswordStrengthIndicator";
import { useResetPassword, useResendResetPasswordOtp } from "@/hooks/usePasswordChange";
import { formatOtpTime } from "@/lib/password-utils";
import { validatePassword } from "@/lib/password-utils";
import { Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const { mutate: resetPassword, isPending: isResettingPassword } = useResetPassword();
  const { mutate: resendOtp, isPending: isResendingOtp } = useResendResetPasswordOtp();

  // Get email from query params if available
  React.useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Countdown timer for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (resendCooldown > 0) return;

    try {
      await resendOtp(email);
      setResendCooldown(120); // Default 2 minutes
      setOtp(""); // Clear OTP
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!email.includes("@")) {
      setErrors({ email: "Invalid email address" });
      return;
    }

    if (otp.length !== 6) {
      setErrors({ otp: "Please enter the 6-digit verification code" });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setErrors({ newPassword: passwordValidation.errors[0] });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    try {
      await resetPassword(email, otp, newPassword);
      // Success - redirect to login
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Reset Password</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Enter the verification code and your new password
        </p>
      </div>
      <form onSubmit={handleReset} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isResettingPassword}
                  className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isResettingPassword}
                  error={!!errors.otp}
                />
              </div>
              {errors.otp && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.otp}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResendingOtp || !email}
                  className="h-auto p-0 text-xs"
                >
                  {resendCooldown > 0
                    ? `Resend in ${formatOtpTime(resendCooldown)}`
                    : "Resend Code"}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
                disabled={isResettingPassword}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.newPassword}</p>
              )}
              {newPassword && (
                <div>
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
                disabled={isResettingPassword}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-2">
              <Button
                type="submit"
                disabled={isResettingPassword}
                className="w-full"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-[var(--groups1-primary)] hover:underline"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-8 shadow-sm">
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-text-secondary)] mx-auto" />
        </div>
      </div>
    }>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

