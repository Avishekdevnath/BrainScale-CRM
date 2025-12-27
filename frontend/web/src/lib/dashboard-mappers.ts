import { formatDistanceToNow, parseISO } from "date-fns";
import type {
  DashboardKPIsResponse,
  ActivityItemAPI,
  KPICardData,
  ActivityItem,
  CallsTrendItem,
  StatusDistributionItem,
  ChartData,
} from "@/types/dashboard.types";

/**
 * Format a date to relative time string (e.g., "30 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return "Unknown time";
    }
    const relative = formatDistanceToNow(dateObj, { addSuffix: true });
    // Convert "about X ago" to "X ago" for cleaner display
    return relative.replace(/^about /, "");
  } catch (error) {
    return "Unknown time";
  }
}

/**
 * Transform backend KPI response to frontend KPICard data format
 */
export function mapKPIsToCards(apiKPIs: DashboardKPIsResponse): KPICardData[] {
  // Calculate trends (mock for now, can be enhanced with previous period comparison)
  const totalStudentsTrend = apiKPIs.overview.totalStudents > 0 ? "+12.5%" : "0%";
  const callsTrend = apiKPIs.activity.callsThisMonth > 0 ? "+8.2%" : "0%";
  const followupsTrend = apiKPIs.followups.pending > 0 ? "-3.1%" : "0%";
  const conversionTrend = apiKPIs.metrics.conversionRate > 0 ? "+2.4%" : "0%";

  return [
    {
      label: "Total Students",
      value: apiKPIs.overview.totalStudents.toLocaleString(),
      trend: {
        value: totalStudentsTrend,
        type: "positive" as const,
      },
    },
    {
      label: "Total Calls",
      value: apiKPIs.overview.totalCalls.toLocaleString(),
      trend: {
        value: callsTrend,
        type: "positive" as const,
      },
    },
    {
      label: "Pending Follow-ups",
      value: apiKPIs.followups.pending.toLocaleString(),
      trend: {
        value: followupsTrend,
        type: apiKPIs.followups.pending > 0 ? "negative" : "neutral",
      },
    },
    {
      label: "Conversion Rate",
      value: `${apiKPIs.metrics.conversionRate.toFixed(1)}%`,
      trend: {
        value: conversionTrend,
        type: "positive" as const,
      },
    },
  ];
}

/**
 * Map backend activity types to frontend activity types
 */
function mapActivityType(backendType: "call" | "followup", status?: string): ActivityItem["type"] {
  if (backendType === "call") {
    // Check if call was successful/converted based on status
    if (status?.toLowerCase().includes("completed") || status?.toLowerCase().includes("converted")) {
      return "converted";
    }
    return "call_logged";
  }
  // For followups, check status to determine type
  if (status?.toLowerCase().includes("pending") || status?.toLowerCase().includes("new")) {
    return "status_update";
  }
  return "status_update";
}

/**
 * Transform backend activity items to frontend format
 */
export function mapRecentActivity(apiActivity: ActivityItemAPI[]): ActivityItem[] {
  return apiActivity.map((item) => {
    const frontendType = mapActivityType(item.type, item.status);
    const timestamp = formatRelativeTime(item.date);
    
    // Use the description from backend, or create a more descriptive one
    let description = item.description;
    if (frontendType === "converted" && item.type === "call") {
      description = `Converted: ${item.studentName}`;
    } else if (frontendType === "call_logged") {
      description = `Logged call with ${item.studentName}`;
    } else if (frontendType === "status_update") {
      description = `Status update for ${item.studentName}`;
    }

    return {
      id: item.id,
      type: frontendType,
      description,
      timestamp,
    };
  });
}

/**
 * Transform calls trend data for chart display
 */
export function mapCallsTrend(apiTrend: CallsTrendItem[]): ChartData[] {
  return apiTrend.map((item) => ({
    date: item.date,
    value: item.count,
  }));
}

/**
 * Transform status distribution data for chart display
 */
export function mapStatusDistribution(apiDistribution: StatusDistributionItem[]): ChartData[] {
  return apiDistribution.map((item) => ({
    name: item.status,
    value: item.count,
  }));
}

/**
 * Format number with appropriate suffix (K, M, etc.)
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

