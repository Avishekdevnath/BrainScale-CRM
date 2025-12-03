"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/usePageTitle";

const plans = [
  {
    id: "FREE",
    name: "Starter",
    price: "$0",
    byline: "Up to 3 users",
    features: [
      "Students & Calls",
      "Follow-ups",
      "Basic imports",
      "Contact notes & tags",
      "Email templates (3)",
      "Basic analytics",
    ],
    available: true,
  },
  {
    id: "PRO",
    name: "Team",
    price: "$29",
    byline: "/user/mo",
    badge: "Recommended",
    features: [
      "Everything in Starter",
      "Advanced imports",
      "Dashboards & charts",
      "Role-based permissions",
      "Team pipelines",
      "Shared templates",
    ],
    available: false, // Coming soon
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "$59",
    byline: "/user/mo",
    features: [
      "Custom roles",
      "Members & groups",
      "Priority support",
      "SSO / SAML",
      "Audit logs",
      "API & webhooks",
    ],
    available: false, // Coming soon
  },
];

export default function ChoosePlanPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  usePageTitle("Choose Plan");

  // Route protection: Check auth and workspace
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken) {
        router.push("/login");
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
        // Allow user to proceed if check fails
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [accessToken, router]);

  const handlePlanSelect = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan || !plan.available) {
      toast.info("This plan is coming soon. Starting with Starter plan for now.");
      // Default to FREE for now
      router.push("/create-workspace?plan=FREE");
      return;
    }

    setSelectedPlan(planId);
    setChecking(true);

    // For now, all plans redirect to create-workspace with FREE
    // Backend defaults to FREE, so we pass FREE regardless of selection
    setTimeout(() => {
      router.push(`/create-workspace?plan=FREE`);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--groups1-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--groups1-text)]">Choose Your Plan</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Select a plan to get started with your workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const isFeatured = i === 1;
          const isSelected = selectedPlan === plan.id;
          const isChecking = checking && isSelected;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <div
                className={cn(
                  "rounded-2xl p-[1px] transition will-change-transform hover:-translate-y-1",
                  isFeatured ? "bg-gradient-to-r from-[var(--groups1-primary)] to-[var(--groups1-primary-hover)] scale-[1.02]" : "bg-gradient-to-r from-[var(--groups1-border)] to-[var(--groups1-border)]",
                  isSelected && "ring-2 ring-[var(--groups1-primary)]"
                )}
              >
                <Card
                  variant={isFeatured ? "default" : "groups1"}
                  className={cn(
                    "h-full !rounded-[calc(1rem-1px)] cursor-pointer transition-all",
                    isFeatured
                      ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-lg"
                      : "",
                    isSelected && "ring-2 ring-[var(--groups1-primary)]"
                  )}
                  onClick={() => !isChecking && handlePlanSelect(plan.id)}
                >
                  <CardHeader variant={isFeatured ? "default" : "groups1"} className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle
                        className={
                          isFeatured
                            ? "text-[var(--groups1-btn-primary-text)]"
                            : "text-[var(--groups1-text)]"
                        }
                      >
                        {plan.name}
                      </CardTitle>
                      {isFeatured && plan.badge && (
                        <span className="rounded-full border border-[var(--groups1-btn-primary-text)]/30 px-2 py-0.5 text-xs font-medium bg-[var(--groups1-btn-primary-text)]/10 text-[var(--groups1-btn-primary-text)]">
                          {plan.badge}
                        </span>
                      )}
                      {!plan.available && (
                        <span className="rounded-full border border-[var(--groups1-border)] px-2 py-0.5 text-xs font-medium bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent variant={isFeatured ? "default" : "groups1"} className="p-4 space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "text-3xl font-semibold",
                          isFeatured
                            ? "text-[var(--groups1-btn-primary-text)]"
                            : "text-[var(--groups1-text)]"
                        )}
                      >
                        {plan.price}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          isFeatured
                            ? "text-[var(--groups1-btn-primary-text)]/85"
                            : "text-[var(--groups1-text-secondary)]"
                        )}
                      >
                        {plan.byline}
                      </span>
                    </div>
                    <ul
                      className={cn(
                        "space-y-2.5 text-sm",
                        isFeatured
                          ? "text-[var(--groups1-btn-primary-text)]"
                          : "text-[var(--groups1-text)]"
                      )}
                    >
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check
                            className={cn(
                              "w-4 h-4 flex-shrink-0",
                              isFeatured
                                ? "text-[var(--groups1-btn-primary-text)]"
                                : "text-[var(--groups1-primary)]"
                            )}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={cn(
                        "w-full h-10",
                        isFeatured
                          ? "bg-[var(--groups1-btn-primary-text)] text-[var(--groups1-primary)] hover:bg-[var(--groups1-btn-primary-text)]/90"
                          : i === 0
                          ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
                          : "border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]",
                        (!plan.available || isChecking) && "opacity-50 cursor-not-allowed"
                      )}
                      variant={isFeatured ? "secondary" : i === 0 ? "default" : "outline"}
                      disabled={!plan.available || isChecking}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isChecking) handlePlanSelect(plan.id);
                      }}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Selecting...
                        </>
                      ) : plan.available ? (
                        "Select Plan"
                      ) : (
                        "Coming Soon"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center text-sm text-[var(--groups1-text-secondary)]">
        <p>All plans include a 14-day free trial. No credit card required.</p>
      </div>
    </div>
  );
}

