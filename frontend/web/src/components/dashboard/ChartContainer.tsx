"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  height?: string;
  showTableToggle?: boolean;
  tableVisible?: boolean;
  onTableToggle?: () => void;
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
  return (
    <div className={cn(height, "w-full bg-[var(--groups1-secondary)] rounded-lg animate-pulse")} />
  );
}

export function ChartContainer({
  title,
  children,
  isLoading = false,
  isEmpty = false,
  error = null,
  onRetry,
  height = "h-[300px]",
  showTableToggle = false,
  tableVisible = false,
  onTableToggle,
}: ChartContainerProps) {
  return (
    <Card variant="groups1">
      <CardHeader variant="groups1" className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {showTableToggle && (
          <Button
            onClick={onTableToggle}
            variant="outline"
            size="sm"
            className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
          >
            <Eye className="w-4 h-4 mr-2" />
            {tableVisible ? "View Chart" : "View Table"}
          </Button>
        )}
      </CardHeader>
      <CardContent variant="groups1">
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-8 h-8 text-[var(--groups1-error)] mb-3" />
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
              Failed to load {title.toLowerCase()}
            </p>
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          <div className={cn(height, "flex items-center justify-center")}>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              No data available for selected filters
            </p>
          </div>
        ) : (
          <div className={tableVisible ? "" : height}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
