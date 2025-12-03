"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ResetPasswordPage() {
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
    <div className="container max-w-md mx-auto py-8">
      <Card variant="groups1">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <form onSubmit={handleReset} className="space-y-4">
            {/* Email Input */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isResettingPassword}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* OTP Input */}
            <div>
              <Label>Verification Code</Label>
              <div className="mt-2">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isResettingPassword}
                  error={!!errors.otp}
                />
              </div>
              {errors.otp && (
                <p className="mt-1 text-sm text-red-600">{errors.otp}</p>
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
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                disabled={isResettingPassword}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              {newPassword && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                disabled={isResettingPassword}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Actions */}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

