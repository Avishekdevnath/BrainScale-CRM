"use client";

import { useMyFeedback } from "@/hooks/useFeedback";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  BUG: "Bug",
  ISSUE: "Issue",
  SUGGESTION: "Suggestion",
  OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  BUG: "border-red-400/40 text-red-500",
  ISSUE: "border-orange-400/40 text-orange-500",
  SUGGESTION: "border-blue-400/40 text-blue-500",
  OTHER: "border-[var(--groups1-border)] text-[var(--groups1-text-secondary)]",
};

function FeedbackSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--groups1-card-border)] p-4 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-[var(--groups1-secondary)] rounded-lg" />
            <div className="h-5 w-14 bg-[var(--groups1-secondary)] rounded-lg" />
            <div className="h-5 w-20 bg-[var(--groups1-secondary)] rounded-lg ml-auto" />
          </div>
          <div className="h-4 w-48 bg-[var(--groups1-secondary)] rounded" />
          <div className="h-10 bg-[var(--groups1-secondary)] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function MyFeedbackPage() {
  usePageTitle("My Feedback");
  const { data: feedback, isLoading, mutate } = useMyFeedback();

  const resolved = feedback?.filter((f) => f.status === "RESOLVED") ?? [];
  const open = feedback?.filter((f) => f.status === "OPEN") ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--groups1-text)] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--groups1-text-secondary)]" />
            My Feedback
          </h1>
          <p className="text-sm text-[var(--groups1-text-secondary)] mt-0.5">
            All your submissions and replies from BrainScale
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href="/app/settings">
            <Button variant="outline" size="sm">+ New</Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && feedback && feedback.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: feedback.length, icon: MessageSquare, color: "text-[var(--groups1-text)]" },
            { label: "Open", value: open.length, icon: Clock, color: "text-blue-500" },
            { label: "Resolved", value: resolved.length, icon: CheckCircle2, color: "text-emerald-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-[var(--groups1-card-border)] bg-[var(--groups1-surface)] p-3 flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div>
                <p className="text-xs text-[var(--groups1-text-secondary)]">{label}</p>
                <p className={cn("text-lg font-bold", color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <FeedbackSkeleton />
      ) : !feedback || feedback.length === 0 ? (
        <div className="rounded-xl border border-[var(--groups1-card-border)] bg-[var(--groups1-surface)] p-12 text-center">
          <MessageSquare className="w-10 h-10 text-[var(--groups1-text-secondary)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--groups1-text-secondary)]">No feedback submitted yet.</p>
          <Link href="/app/settings">
            <Button size="sm" className="mt-4">Submit feedback</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => {
            const hasReply = Boolean(f.reply);
            const isResolved = f.status === "RESOLVED";
            return (
              <div
                key={f.id}
                className={cn(
                  "rounded-xl border bg-[var(--groups1-surface)] p-4 space-y-3 transition-colors",
                  hasReply
                    ? "border-[var(--groups1-primary)]/30"
                    : "border-[var(--groups1-card-border)]"
                )}
              >
                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs px-2 py-0.5 rounded-lg border font-medium", TYPE_COLORS[f.type] ?? TYPE_COLORS.OTHER)}>
                    {TYPE_LABELS[f.type] ?? f.type}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-lg border font-medium inline-flex items-center gap-1",
                      isResolved
                        ? "border-emerald-500/40 text-emerald-600"
                        : "border-blue-500/40 text-blue-500"
                    )}
                  >
                    {isResolved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {isResolved ? "Resolved" : "Open"}
                  </span>
                  {hasReply && (
                    <span className="text-xs px-2 py-0.5 rounded-lg border border-[var(--groups1-primary)]/40 text-[var(--groups1-primary)] font-medium">
                      Reply received
                    </span>
                  )}
                  <span className="text-xs text-[var(--groups1-text-secondary)] ml-auto">
                    {new Date(f.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                {/* Title + message */}
                {f.title && (
                  <p className="text-sm font-semibold text-[var(--groups1-text)]">{f.title}</p>
                )}
                <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">{f.message}</p>

                {/* Reply */}
                {hasReply && (
                  <div className="ml-0 pl-3 border-l-2 border-[var(--groups1-primary)]/50 space-y-1 bg-[var(--groups1-primary)]/5 rounded-r-lg py-2 pr-2">
                    <p className="text-xs font-medium text-[var(--groups1-primary)]">
                      Reply from BrainScale
                      {f.repliedAt && (
                        <span className="text-[var(--groups1-text-secondary)] font-normal ml-2">
                          · {new Date(f.repliedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-[var(--groups1-text)] whitespace-pre-wrap">{f.reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
