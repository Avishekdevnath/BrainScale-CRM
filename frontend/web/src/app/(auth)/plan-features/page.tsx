"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

const planFeatures = {
  FREE: {
    name: "Starter",
    included: [
      "1 workspace",
      "Up to 3 users",
      "Unlimited students",
      "Unlimited calls",
      "Basic imports",
      "Follow-ups & reminders",
      "Basic dashboards",
      "Email support",
    ],
    limitations: [
      "Only 1 workspace allowed",
      "Up to 3 team members",
      "Basic analytics only",
    ],
  },
  PRO: {
    name: "Team",
    included: [
      "Multiple workspaces",
      "Unlimited users",
      "Everything in Starter",
      "Advanced imports",
      "Dashboards & charts",
      "Role-based permissions",
      "Team pipelines",
      "Shared templates",
    ],
    limitations: ["Billing per active user"],
  },
  BUSINESS: {
    name: "Business",
    included: [
      "Everything in Team",
      "Custom roles",
      "Members & groups",
      "Priority support",
      "SSO / SAML",
      "Audit logs",
      "API & webhooks",
    ],
    limitations: ["Billing per active user"],
  },
};

export default function PlanFeaturesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-sm text-[var(--groups1-text-secondary)]">
          Loading plan details...
        </div>
      }
    >
      <PlanFeaturesPageContent />
    </Suspense>
  );
}

function PlanFeaturesPageContent() {
  usePageTitle("Plan Features");
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") || "FREE";
  const accessToken = useAuthStore((state) => state.accessToken);
  const { current: workspace, getCurrentPlan } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);

  // Determine plan from URL param or workspace
  const plan = (planParam.toUpperCase() as "FREE" | "PRO" | "BUSINESS") || getCurrentPlan() || "FREE";
  const features = planFeatures[plan] || planFeatures.FREE;

  // Route protection
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        router.push("/login");
        return;
      }

      try {
        const workspaces = await apiClient.getWorkspaces();
        if (!workspaces || workspaces.length === 0) {
          router.push("/create-workspace");
          return;
        }
      } catch (error) {
        console.error("Workspace check failed:", error);
        router.push("/create-workspace");
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accessToken, router]);

  const handleContinue = () => {
    toast.success("Welcome to your workspace!");
    router.push("/app");
  };

  const handleUpgrade = () => {
    router.push("/app/billing");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-lg mx-auto">
      {/* Success Message */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">
          Workspace created successfully!
        </h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Your {features.name} plan is now active
        </p>
      </div>

      {/* Plan Badge */}
      <div className="text-center">
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] text-sm font-medium">
          {features.name} Plan
        </span>
      </div>

      {/* Included Features */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle className="text-lg text-[var(--groups1-text)]">Included Features</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3 pb-6">
          {features.included.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--groups1-success)] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[var(--groups1-text)]">{feature}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Limitations */}
      {features.limitations.length > 0 && (
        <Card variant="groups1" className="border-[var(--groups1-warning)]/30">
          <CardHeader variant="groups1">
            <CardTitle className="text-lg text-[var(--groups1-text)] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--groups1-warning)]" />
              Limitations
            </CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-3 pb-6">
            {features.limitations.map((limitation) => (
              <div key={limitation} className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--groups1-warning)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--groups1-text)]">{limitation}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          onClick={handleContinue}
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)] h-11"
        >
          Continue to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        {plan === "FREE" && (
          <Button
            onClick={handleUpgrade}
            className="w-full border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            Upgrade Plan
          </Button>
        )}
      </div>

      <div className="text-center text-xs text-[var(--groups1-text-secondary)] pt-2">
        <p>You can upgrade or change your plan anytime from workspace settings.</p>
      </div>
    </div>
  );
}

