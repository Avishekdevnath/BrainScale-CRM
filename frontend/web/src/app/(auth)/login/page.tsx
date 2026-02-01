"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      const res = await apiClient.login(values);
      // Store user info if available
      let user: { id: string; name: string | null; email: string } | undefined;
      if (res.user) {
        user = {
          id: res.user.id || "",
          name: res.user.name || null,
          email: res.user.email || values.email,
        };
      } else {
        // If user not in response, create minimal user object from email
        user = {
          id: "",
          name: null,
          email: values.email,
        };
      }
      setTokens({ 
        accessToken: res.accessToken, 
        refreshToken: res.refreshToken,
        user,
      });

      // Check for workspaces
      try {
          const workspaces = await apiClient.getWorkspaces();
          if (!workspaces || workspaces.length === 0) {
            toast.info("Let's set up your workspace");
            router.push("/create-workspace");
          } else {
          // Set first workspace as current
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
        // If workspace check fails, redirect to create-workspace as fallback
        console.error("Workspace check failed:", workspaceError);
        router.push("/create-workspace");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
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
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Login</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Sign in to your account to continue
        </p>
        <p className="text-xs text-[var(--groups1-text-secondary)]">
          If you recently requested a verification or reset email and don&apos;t see it, please check your spam or junk folder.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--groups1-primary)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
        <div className="pt-2 text-center text-xs text-[var(--groups1-text-secondary)]">
          <span>Don&apos;t have an account? </span>
          <Link
            href="/signup"
            className="font-medium text-[var(--groups1-primary)] hover:underline"
          >
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}


