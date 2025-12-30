"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterCriteria {
  batchId?: string;
  groupId?: string;
  status?: string;
  q?: string;
}

interface CollapsibleFilterCriteriaProps {
  filters: FilterCriteria;
}

export function CollapsibleFilterCriteria({ filters }: CollapsibleFilterCriteriaProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const filterCount = [
    filters.batchId ? 1 : 0,
    filters.groupId ? 1 : 0,
    filters.status ? 1 : 0,
    filters.q ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (filterCount === 0) return null;

  return (
    <Card variant="groups1">
      <CardHeader variant="groups1" className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--groups1-text)]">Filter Criteria</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
              {filterCount}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)] dark:hover:bg-[var(--groups1-secondary)]"
          >
            {isExpanded ? (
              <>
                <span className="text-xs mr-1">Hide</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="text-xs mr-1">Show</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent
          variant="groups1"
          className={cn(
            "pb-6 border-t border-[var(--groups1-border)] transition-all duration-200",
            isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {filters.batchId && (
              <div>
                <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                  Batch
                </div>
                <div className="text-sm font-medium text-[var(--groups1-text)]">
                  {filters.batchId}
                </div>
              </div>
            )}
            {filters.groupId && (
              <div>
                <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                  Group
                </div>
                <div className="text-sm font-medium text-[var(--groups1-text)]">
                  {filters.groupId}
                </div>
              </div>
            )}
            {filters.status && (
              <div>
                <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                  Status
                </div>
                <div className="text-sm font-medium text-[var(--groups1-text)]">
                  {filters.status}
                </div>
              </div>
            )}
            {filters.q && (
              <div>
                <div className="text-xs text-[var(--groups1-text-secondary)] uppercase tracking-wide mb-1">
                  Search
                </div>
                <div className="text-sm font-medium text-[var(--groups1-text)]">
                  {filters.q}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

