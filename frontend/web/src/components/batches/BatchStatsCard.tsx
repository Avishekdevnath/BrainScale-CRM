"use client";

import { useBatchStats } from "@/hooks/useBatches";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { BatchStatsResponse } from "@/types/batches.types";

export interface BatchStatsCardProps {
  batchId: string | null;
  stats?: BatchStatsResponse;
  className?: string;
}

export function BatchStatsCard({
  batchId,
  stats: providedStats,
  className,
}: BatchStatsCardProps) {
  const { data: fetchedStats, isLoading, error } = useBatchStats(
    providedStats ? null : batchId
  );

  const stats = providedStats || fetchedStats;

  if (!batchId && !providedStats) {
    return null;
  }

  if (isLoading && !providedStats) {
    return (
      <Card variant="groups1" className={className}>
        <CardHeader variant="groups1">
          <CardTitle>Batch Statistics</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--groups1-text-secondary)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !providedStats) {
    return (
      <Card variant="groups1" className={className}>
        <CardHeader variant="groups1">
          <CardTitle>Batch Statistics</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          <div className="text-sm text-red-600 dark:text-red-400">
            Error loading batch statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card variant="groups1" className={className}>
      <CardHeader variant="groups1">
        <CardTitle>Batch Statistics</CardTitle>
      </CardHeader>
      <CardContent variant="groups1" className="pb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            label="Groups"
            value={stats.counts.groups}
          />
          <KPICard
            label="Students"
            value={stats.counts.students}
          />
          <KPICard
            label="Enrollments"
            value={stats.counts.enrollments}
          />
          <KPICard
            label="Calls"
            value={stats.counts.calls}
          />
          <KPICard
            label="Follow-ups"
            value={stats.counts.followups}
          />
        </div>
      </CardContent>
    </Card>
  );
}

