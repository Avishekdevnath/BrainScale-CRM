/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCountdown } from "@/hooks/useCountdown";
import { Loader2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;

const formatSeconds = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
          Loading verification form...
        </div>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailPageContent() {
  usePageTitle("Verify Email");
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get("token"), [params]);
  const initialEmail = useMemo(() => params.get("email") ?? "", [params]);

  const [tokenStatus, setTokenStatus] = useState<"idle" | "loading" | "error">("idle");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [canRetryAt, setCanRetryAt] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);

  const resendCountdown = useCountdown(canRetryAt);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!token) {
      setTokenStatus("idle");
      return;
    }
    const verifyWithToken = async () => {
      setTokenStatus("loading");
      setTokenError(null);
      try {
        await apiClient.verifyEmail(token);
        setVerified(true);
        toast.success("Email verified. You can sign in now.");
      } catch (error: any) {
        setTokenStatus("error");
        const message = error?.message ?? "Verification failed. Enter the code from your email or request a new one.";
        setTokenError(message);
        toast.error(message);
      }
    };
    void verifyWithToken();
  }, [token]);


  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpTimeLeft(0);
      return;
    }
    const update = () => {
      setOtpTimeLeft(Math.max(0, Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
  };

  const handleVerifyOtp = async () => {
    if (!email) {
      toast.error("Enter your email address");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      toast.error("Enter the 6-digit code we emailed you");
      return;
    }

    setVerifyingOtp(true);
    try {
      await apiClient.verifyEmailOtp({ email, otp });
      setVerified(true);
      toast.success("Email verified. You can sign in now.");
      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (error: any) {
      const message = error?.message ?? "Invalid code. Please try again.";
      toast.error(message);
      setAttemptsRemaining((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) {
          setOtp("");
        }
        return next;
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    if (!resendCountdown.isReady) {
      return;
    }
    setResending(true);
    try {
      const response = await apiClient.resendVerificationOtp({ email });
      toast.success(response.message || "Verification code sent. Check your inbox.");
      
      // Calculate new retry time based on canRetryAfter (2 minutes = 120 seconds)
      const now = new Date();
      const newCanRetryAt = new Date(now.getTime() + (response.canRetryAfter * 1000)).toISOString();
      setCanRetryAt(newCanRetryAt);
      
      setOtpExpiresAt(new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000));
      setAttemptsRemaining(MAX_ATTEMPTS);
      setOtp("");
    } catch (error: any) {
      if (error.status === 429 && error.canRetryAt) {
        // Update retry time from error
        setCanRetryAt(error.canRetryAt);
        toast.error(error.message || "Please wait before retrying.");
      } else if (error.status === 429 && error.retryAfter) {
        // Fallback: calculate canRetryAt from retryAfter if canRetryAt is missing
        const now = new Date();
        const canRetryAt = new Date(now.getTime() + (error.retryAfter * 1000)).toISOString();
        setCanRetryAt(canRetryAt);
        toast.error(error.message || "Please wait before retrying.");
      } else {
        toast.error(error?.message ?? "Could not send verification code");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Verify your email</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          {verified ? "Your email address is verified. You can continue to sign in." : "Enter the code we emailed you or resend a new one."}
        </p>
      </div>

      {tokenStatus === "loading" && (
        <p className="text-sm text-[var(--groups1-text-secondary)]">Verifying your email link…</p>
      )}

      {tokenStatus === "error" && tokenError && (
        <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          {tokenError}
        </div>
      )}

      {verified ? (
        <Button
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
          onClick={() => router.push("/login")}
        >
          Go to login
        </Button>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--groups1-text)]">Email address</label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            />
            <p className="text-xs text-[var(--groups1-text-secondary)]">We'll send verification codes to this email.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleResendOtp}
              disabled={resending || !resendCountdown.isReady || !email}
              className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : !resendCountdown.isReady && canRetryAt ? (
                `Resend in ${resendCountdown.formatted}`
              ) : (
                "Send code"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/login")}
              className="text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Back to login
            </Button>
          </div>
          
          {!resendCountdown.isReady && canRetryAt && (
            <p className="text-xs text-[var(--groups1-text-secondary)] text-center">
              You can retry sending the verification code in {resendCountdown.formatted}. 
              You can retry as many times as needed until your account is verified.
            </p>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--groups1-text)]">One-time code</label>
            <Input
              inputMode="numeric"
              pattern="\d*"
              maxLength={OTP_LENGTH}
              autoComplete="one-time-code"
              placeholder="••••••"
              value={otp}
              onChange={(event) => handleOtpChange(event.target.value)}
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--groups1-text-secondary)]">
              <span>Attempts remaining: {attemptsRemaining} / {MAX_ATTEMPTS}</span>
              {otpExpiresAt ? (
                otpTimeLeft > 0 ? (
                  <span>Code expires in {formatSeconds(otpTimeLeft)}</span>
                ) : (
                  <span>Code expired — request a new one.</span>
                )
              ) : (
                <span>Codes expire about {OTP_EXPIRY_MINUTES} minutes after they're sent.</span>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            onClick={handleVerifyOtp}
            disabled={verifyingOtp || otp.length !== OTP_LENGTH || !email || attemptsRemaining === 0}
          >
            {verifyingOtp ? "Verifying…" : "Verify with code"}
          </Button>
        </div>
      )}
    </div>
  );
}
