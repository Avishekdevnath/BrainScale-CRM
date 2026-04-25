"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/password/OtpInput";
import { PasswordStrengthIndicator } from "@/components/password/PasswordStrengthIndicator";
import {
  useForgotPassword,
  useResetPassword,
  useResendResetPasswordOtp,
} from "@/hooks/usePasswordChange";
import { formatOtpTime } from "@/lib/password-utils";
import { validatePassword } from "@/lib/password-utils";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Inbox,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type Step = "email" | "reset";

const RESEND_COOLDOWN = 120;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const { mutate: forgotPassword, isPending: isRequestingReset } = useForgotPassword();
  const { mutate: resetPassword, isPending: isResettingPassword } = useResetPassword();
  const { mutate: resendOtp, isPending: isResendingOtp } = useResendResetPasswordOtp();

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!email.includes("@")) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }

    try {
      await forgotPassword(email);
      setResendCooldown(RESEND_COOLDOWN);
      setStep("reset");
      setErrors({});
    } catch {
      // hook handles toast
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendOtp(email);
      setResendCooldown(RESEND_COOLDOWN);
      setOtp("");
    } catch {
      // hook handles toast
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (otp.length !== 6) {
      setErrors({ otp: "Enter the 6-digit verification code" });
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
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      // hook handles toast
    }
  };

  const cooldownPct =
    resendCooldown > 0 ? ((RESEND_COOLDOWN - resendCooldown) / RESEND_COOLDOWN) * 100 : 100;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-6 h-24 rounded-full bg-[var(--groups1-primary)]/10 blur-3xl"
      />
      <div className="relative space-y-6 rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)]/95 p-7 shadow-lg backdrop-blur-sm sm:p-8">
        <StepIndicator step={step} />

        {step === "email" ? (
          <EmailStep
            email={email}
            setEmail={setEmail}
            errors={errors}
            isLoading={isRequestingReset}
            onSubmit={handleRequestReset}
          />
        ) : (
          <ResetStep
            email={email}
            otp={otp}
            setOtp={setOtp}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            errors={errors}
            isLoading={isResettingPassword}
            isResendingOtp={isResendingOtp}
            resendCooldown={resendCooldown}
            cooldownPct={cooldownPct}
            onSubmit={handleReset}
            onResend={handleResendOtp}
            onBack={() => {
              setStep("email");
              setOtp("");
              setNewPassword("");
              setConfirmPassword("");
              setErrors({});
            }}
          />
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const isEmail = step === "email";
  return (
    <div className="flex items-center gap-3" aria-label={`Step ${isEmail ? 1 : 2} of 2`}>
      <div className="flex items-center gap-2">
        <span
          className={
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
            (isEmail
              ? "bg-[var(--groups1-primary)] text-white"
              : "bg-[var(--groups1-primary)]/15 text-[var(--groups1-primary)]")
          }
        >
          {isEmail ? "1" : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <span className="hidden text-xs font-medium text-[var(--groups1-text-secondary)] sm:inline">
          Verify email
        </span>
      </div>
      <div className="h-px flex-1 bg-[var(--groups1-border)]" />
      <div className="flex items-center gap-2">
        <span
          className={
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors " +
            (!isEmail
              ? "bg-[var(--groups1-primary)] text-white"
              : "bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]")
          }
        >
          2
        </span>
        <span className="hidden text-xs font-medium text-[var(--groups1-text-secondary)] sm:inline">
          New password
        </span>
      </div>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1 flex items-start gap-1 text-xs text-red-600 dark:text-red-400"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function EmailStep({
  email,
  setEmail,
  errors,
  isLoading,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  errors: Record<string, string>;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <header className="space-y-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]">
          <KeyRound className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--groups1-text)]">
            Forgot your password?
          </h1>
          <p className="text-sm leading-relaxed text-[var(--groups1-text-secondary)]">
            Enter the email tied to your account. We&apos;ll send a 6-digit verification code to
            reset it.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[var(--groups1-text)]">
            Email address
          </Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--groups1-text-secondary)]"
              aria-hidden
            />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              autoFocus
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : "email-hint"}
              className="h-11 pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            />
          </div>
          {errors.email ? (
            <FieldError id="email-error">{errors.email}</FieldError>
          ) : (
            <p id="email-hint" className="text-xs text-[var(--groups1-text-secondary)]">
              We&apos;ll never share your email.
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-secondary)]/40 p-3 text-xs text-[var(--groups1-text-secondary)]">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-[var(--groups1-primary)]" aria-hidden />
          <span>
            Email not in your inbox? Check the <strong className="font-medium">spam</strong> or{" "}
            <strong className="font-medium">junk</strong> folder.
          </span>
        </div>

        <Button
          type="submit"
          disabled={!email || isLoading}
          className="h-11 w-full text-sm font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            "Send verification code"
          )}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-sm">
          <span className="text-[var(--groups1-text-secondary)]">Remembered it?</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-[var(--groups1-primary)] transition-colors hover:underline focus-visible:outline-none focus-visible:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to login
          </Link>
        </div>
      </form>
    </>
  );
}

function ResetStep({
  email,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  errors,
  isLoading,
  isResendingOtp,
  resendCooldown,
  cooldownPct,
  onSubmit,
  onResend,
  onBack,
}: {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (fn: (p: boolean) => boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (fn: (p: boolean) => boolean) => void;
  errors: Record<string, string>;
  isLoading: boolean;
  isResendingOtp: boolean;
  resendCooldown: number;
  cooldownPct: number;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <header className="space-y-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-primary)]/10 text-[var(--groups1-primary)]">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--groups1-text)]">
            Set a new password
          </h1>
          <p className="text-sm leading-relaxed text-[var(--groups1-text-secondary)]">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-[var(--groups1-text)]">{email}</span> and choose a new
            password.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--groups1-text)]">Verification code</Label>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-[var(--groups1-primary)] transition-colors hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Wrong email?
            </button>
          </div>
          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
            error={!!errors.otp}
          />
          {errors.otp && <FieldError id="otp-error">{errors.otp}</FieldError>}

          <div className="space-y-1.5 pt-1">
            {resendCooldown > 0 && (
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-[var(--groups1-secondary)]"
                role="progressbar"
                aria-valuenow={Math.round(cooldownPct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-[var(--groups1-primary)] transition-[width] duration-1000 ease-linear"
                  style={{ width: `${cooldownPct}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--groups1-text-secondary)]">
                Didn&apos;t get the code?
              </span>
              <button
                type="button"
                onClick={onResend}
                disabled={resendCooldown > 0 || isResendingOtp}
                className="inline-flex items-center gap-1 font-medium text-[var(--groups1-primary)] transition-colors hover:underline disabled:cursor-not-allowed disabled:text-[var(--groups1-text-secondary)] disabled:no-underline focus-visible:outline-none focus-visible:underline"
              >
                {isResendingOtp ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Sending
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${formatOtpTime(resendCooldown)}`
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" /> Resend code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-[var(--groups1-text)]">
            New password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? "new-password-error" : undefined}
              className="h-11 pr-11 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--groups1-text-secondary)] transition-colors hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <FieldError id="new-password-error">{errors.newPassword}</FieldError>
          )}
          {newPassword && <PasswordStrengthIndicator password={newPassword} />}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-[var(--groups1-text)]">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              className="h-11 pr-11 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--groups1-text-secondary)] transition-colors hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--groups1-focus-ring)]"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <FieldError id="confirm-password-error">{errors.confirmPassword}</FieldError>
          )}
          {confirmPassword && newPassword === confirmPassword && !errors.confirmPassword && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Passwords match
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="h-11 sm:flex-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="h-11 sm:flex-1">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
