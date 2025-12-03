"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";

const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(60, "Workspace name must be at most 60 characters"),
  logo: z
    .string()
    .url("Invalid URL")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  timezone: z.string().default("Asia/Dhaka"),
});

type CreateWorkspaceFormValues = z.input<typeof CreateWorkspaceSchema>;
type CreateWorkspaceValues = z.output<typeof CreateWorkspaceSchema>;

const plans = [
  {
    id: "FREE",
    name: "Starter",
    price: "$0",
    features: ["1 workspace", "Up to 3 users", "Basic features"],
  },
  {
    id: "PRO",
    name: "Team",
    price: "$29/user/mo",
    features: ["Multiple workspaces", "Advanced features"],
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "$59/user/mo",
    features: ["Everything in Team", "Enterprise features"],
  },
];

const commonTimezones = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka (GMT+6)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+5:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (GMT-8)" },
  { value: "Europe/London", label: "Europe/London (GMT+0)" },
];

export default function CreateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
          Loading workspace...
        </div>
      }
    >
      <CreateWorkspacePageContent />
    </Suspense>
  );
}

function CreateWorkspacePageContent() {
  usePageTitle("Create Workspace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") || "FREE";
  const accessToken = useAuthStore((state) => state.accessToken);
  const { setCurrentFromApi } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans.find((p) => p.id === planParam) || plans[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(CreateWorkspaceSchema),
    defaultValues: {
      timezone: "Asia/Dhaka",
    },
  });

  // Route protection
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        router.push("/login");
        return;
      }

      if (!planParam) {
        router.push("/choose-plan");
        return;
      }

      try {
        const workspaces = await apiClient.getWorkspaces();
        if (workspaces && workspaces.length > 0) {
          router.push("/app");
          return;
        }
      } catch (error) {
        console.error("Workspace check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accessToken, router, planParam]);

  const onSubmit = async (values: CreateWorkspaceFormValues) => {
    const parsedValues = CreateWorkspaceSchema.parse(values);
    setSubmitting(true);
    try {
      const workspace = await apiClient.createWorkspace({
        name: parsedValues.name,
        logo: parsedValues.logo,
        timezone: parsedValues.timezone,
      });

      // Store workspace in store
      setCurrentFromApi({
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        logo: workspace.logo,
        timezone: workspace.timezone,
      });

      toast.success("Workspace created successfully!");
      router.push(`/plan-features?plan=${planParam}`);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create workspace";
      toast.error(errorMessage);

      // Handle specific errors
      if (errorMessage.includes("Free plan limit reached")) {
        toast.info("You've reached the free plan limit. Please upgrade to create more workspaces.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/choose-plan")}
          className="text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to plans
        </Button>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Create Your Workspace</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Set up your workspace to get started
        </p>
      </div>

      {/* Selected Plan Display */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle className="text-sm font-medium text-[var(--groups1-text-secondary)] uppercase tracking-wide">
            Selected Plan
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[var(--groups1-text)]">{selectedPlan.name}</div>
              <div className="text-sm text-[var(--groups1-text-secondary)]">
                {selectedPlan.price}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {selectedPlan.features.slice(0, 2).map((feature) => (
                <div key={feature} className="text-xs text-[var(--groups1-text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--groups1-primary)]" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Creation Form */}
      <Card variant="groups1">
        <CardContent variant="groups1" className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[var(--groups1-text)]">
                Workspace Name <span className="text-[var(--groups1-error)]">*</span>
              </Label>
              <Input
                  id="name"
                  placeholder="My Workspace"
                  {...register("name")}
                  className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
                  disabled={submitting}
                />
              {errors.name && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                2-60 characters. This name will be visible to all workspace members.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo" className="text-sm font-medium text-[var(--groups1-text)]">
                Logo URL <span className="text-xs text-[var(--groups1-text-secondary)]">(Optional)</span>
              </Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                {...register("logo")}
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)] focus-visible:border-[var(--groups1-primary)] focus-visible:ring-[var(--groups1-focus-ring)]"
                disabled={submitting}
              />
              {errors.logo && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.logo.message}</p>
              )}
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                Optional: Add a logo URL for your workspace
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium text-[var(--groups1-text)]">
                Timezone <span className="text-xs text-[var(--groups1-text-secondary)]">(Optional)</span>
              </Label>
              <select
                id="timezone"
                {...register("timezone")}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                  "bg-[var(--groups1-background)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23134252%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right-3 bg-[length:16px] pr-8",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
                disabled={submitting}
              >
                {commonTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors.timezone.message}</p>
              )}
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                Default timezone for your workspace
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => router.push("/choose-plan")}
                disabled={submitting}
                className="flex-1 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Workspace"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

