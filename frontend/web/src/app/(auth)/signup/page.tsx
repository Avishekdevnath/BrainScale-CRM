"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountdown } from "@/hooks/useCountdown";
import { usePageTitle } from "@/hooks/usePageTitle";

const pwPolicy = z
  .string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "1 uppercase letter")
  .regex(/[a-z]/, "1 lowercase letter")
  .regex(/\d/, "1 number")
  .regex(/[^A-Za-z0-9]/, "1 special character");

const SignupSchema = z
  .object({
    name: z.string().min(2, "Enter your name"),
    email: z.string().email("Enter a valid email"),
    password: pwPolicy,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type SignupValues = z.infer<typeof SignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  usePageTitle("Sign Up");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [retryInfo, setRetryInfo] = useState<{
    canRetryAt?: string;
    retryAfter?: number;
    actionRequired?: string[];
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [retrying, setRetrying] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignupValues>({ resolver: zodResolver(SignupSchema) });

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (token || accessToken) {
          // User is already logged in, redirect to app
          router.push("/app");
          return;
        }
      } catch {}
      setChecking(false);
    };
    checkAuth();
  }, [accessToken, router]);

  const countdown = useCountdown(retryInfo?.canRetryAt);

  const onSubmit = async (values: SignupValues) => {
    setSubmitting(true);
    try {
      // Only send name, email, and password to API (exclude confirmPassword)
      const { confirmPassword, ...signupData } = values;
      const response = await apiClient.signup(signupData);
      
      setUserEmail(values.email);
      setEmailSent(response.emailSent);
      
      if (response.emailSent) {
        toast.success("Account created! Please check your email (including spam folder) to verify your account.");
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}&signup=true`);
      } else {
        // Email failed to send
        setRetryInfo({
          canRetryAt: response.canRetryAt,
          retryAfter: response.retryAfter,
          actionRequired: response.actionRequired,
        });
        toast.warning(response.message || "Account created, but verification email couldn't be sent.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!userEmail || !countdown.isReady) return;
    
    setRetrying(true);
    try {
      // Use signup-specific endpoint
      const response = await apiClient.resendSignupVerification(userEmail);
      toast.success(response.message || "Verification email sent! Please check your inbox and spam folder.");
      
      // Calculate new retry time based on canRetryAfter (default to 120 seconds if not provided)
      const retryAfter = response.canRetryAfter ?? 120;
      const now = new Date();
      const canRetryAt = new Date(now.getTime() + (retryAfter * 1000)).toISOString();
      setRetryInfo({
        canRetryAt,
        retryAfter: retryAfter,
      });
    } catch (error: any) {
      if (error.status === 429 && error.canRetryAt) {
        // Update retry info from error
        setRetryInfo({
          canRetryAt: error.canRetryAt,
          retryAfter: error.retryAfter,
        });
        toast.error(error.message || "Please wait before retrying.");
      } else if (error.status === 429 && error.retryAfter) {
        // Fallback: calculate canRetryAt from retryAfter if canRetryAt is missing
        const now = new Date();
        const canRetryAt = new Date(now.getTime() + (error.retryAfter * 1000)).toISOString();
        setRetryInfo({
          canRetryAt,
          retryAfter: error.retryAfter,
        });
        toast.error(error.message || "Please wait before retrying.");
      } else {
        toast.error(error?.message ?? "Failed to send verification email. Please try again.");
      }
    } finally {
      setRetrying(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-8 shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Create your account</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Get started with a free account today
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--groups1-text)]">Name</label>
          <Input
            placeholder="John Doe"
            {...register("name")}
            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
          />
          {errors.name && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--groups1-text)]">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
          />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--groups1-text)]">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)] pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] rounded p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              8+ chars, upper, lower, number, special
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--groups1-text)]">Confirm Password</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirmPassword")}
              className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)] pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] rounded p-1"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Email Retry UI - Show when emailSent is false */}
      {emailSent === false && retryInfo && (
        <Card variant="groups1" className="border-[var(--groups1-warning)]/30">
          <CardContent variant="groups1" className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--groups1-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-[var(--groups1-text)]">
                  Verification email couldn't be sent
                </h3>
                <p className="text-xs text-[var(--groups1-text-secondary)]">
                  Your account was created successfully, but we couldn't send the verification email at this time.
                </p>
              </div>
            </div>

            {retryInfo.actionRequired && retryInfo.actionRequired.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--groups1-text)]">What to do next:</p>
                <ul className="space-y-1.5">
                  {retryInfo.actionRequired.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-[var(--groups1-text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--groups1-primary)] mt-1.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleRetry}
                disabled={!countdown.isReady || retrying}
                className="flex-1 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {retrying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : countdown.isReady ? (
                  "Resend Verification Email"
                ) : (
                  `Retry in ${countdown.formatted}`
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/verify-email")}
                className="border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Go to Verify
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


