"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setTokens = useAuthStore((s) => s.setTokens);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  usePageTitle("Sign In");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) });

  useEffect(() => {
    if (accessToken) {
      router.push("/app");
      return;
    }
    setChecking(false);
  }, [accessToken, router]);

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      const res = await apiClient.login(values);
      let user: { id: string; name: string | null; email: string } | undefined;
      if (res.user) {
        user = {
          id: res.user.id || "",
          name: res.user.name || null,
          email: res.user.email || values.email,
        };
      } else {
        user = { id: "", name: null, email: values.email };
      }
      setTokens({ accessToken: res.accessToken, user });

      try {
        const workspaces = await apiClient.getWorkspaces();
        if (!workspaces || workspaces.length === 0) {
          toast.info("Let's set up your workspace");
          router.push("/create-workspace");
        } else {
          const workspaceStore = useWorkspaceStore.getState();
          workspaceStore.setCurrentFromApi({
            id: workspaces[0].id,
            name: workspaces[0].name,
            plan: workspaces[0].plan,
            logo: workspaces[0].logo,
            timezone: workspaces[0].timezone,
          });
          toast.success("Welcome back!");
          router.push("/app");
        }
      } catch (workspaceError) {
        console.error("Workspace check failed:", workspaceError);
        router.push("/create-workspace");
      }
    } catch (e: any) {
      if (e?.status === 401) {
        toast.error("Incorrect email or password. Please try again.");
      } else {
        toast.error(e?.message ?? "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  return (
    <div className="grid min-h-[520px] overflow-hidden rounded-2xl border border-[var(--groups1-border)] shadow-xl md:grid-cols-2">
      {/* Left: Brand panel */}
      <div
        className="hidden flex-col justify-between p-10 md:flex"
        style={{
          background:
            "linear-gradient(150deg, var(--color-slate-900) 0%, var(--groups1-primary) 100%)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/assets/logo.png"
            alt="BrainScale CRM"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold text-white">BrainScale CRM</span>
        </Link>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold leading-snug text-white">
              The CRM that moves
              <br />
              as fast as your team.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Log calls, track follow-ups, and close more deals—all in one place.
            </p>
          </div>

          <ul className="space-y-2.5">
            {[
              "Search by phone, email, or name",
              "Smart follow-up engine with due dates",
              "Analytics dashboards per team & batch",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                {f}
              </li>
            ))}
          </ul>

          <blockquote className="border-l-2 border-white/30 pl-4">
            <p className="text-sm italic text-white/70">
              &ldquo;BrainScale CRM boosted our enrollment conversion by 22% in the first month.&rdquo;
            </p>
            <footer className="mt-2 text-xs text-white/50">
              — Nadia Rahman, Ops Lead at EduReach
            </footer>
          </blockquote>
        </div>

        <p className="text-xs text-white/40">© {new Date().getFullYear()} BrainScale CRM</p>
      </div>

      {/* Right: Form panel */}
      <div className="flex items-center justify-center bg-[var(--groups1-surface)] p-8 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Welcome back</h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Sign in to continue to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--groups1-text)]">Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                {...register("email")}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
              />
              {errors.email && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--groups1-text)]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--groups1-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--groups1-text-secondary)] transition-colors hover:text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-[var(--groups1-text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-[var(--groups1-primary)] hover:underline">
              Sign up free
            </Link>
          </p>
          <p className="text-center text-xs text-[var(--groups1-text-secondary)]">
            Can&apos;t find your verification email? Check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}
