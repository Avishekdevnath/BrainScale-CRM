// Dashboard API Types - Backend Response Structures

import type { CallListSource } from "./call-lists.types";

export interface DashboardFilters {
  groupId?: string;
  batchId?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  period?: 'day' | 'week' | 'month' | 'year';
}

// Backend API Response Types
export interface DashboardKPIsResponse {
  overview: {
    totalStudents: number;
    totalCalls: number;
    totalFollowups: number;
    totalGroups: number;
    totalCourses: number;
  };
  activity: {
    callsToday: number;
    callsThisWeek: number;
    callsThisMonth: number;
    activeCalls: number;
  };
  followups: {
    pending: number;
    overdue: number;
    total: number;
    totalFollowUpCalls?: number; // Optional: all follow-up calls for analytics
  };
  metrics: {
    conversionRate: number;
    averageCallsPerDay: number;
  };
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface StudentsByGroupItem {
  groupId: string;
  groupName: string;
  studentCount: number;
}

export interface CallsTrendItem {
  date: string;
  count: number;
}

export interface ActivityItemAPI {
  type: 'call' | 'followup';
  id: string;
  date: Date | string; // ISO date string from API
  studentName: string;
  groupName: string;
  status: string;
  description: string;
}

export interface DashboardSummaryResponse {
  kpis: DashboardKPIsResponse;
  distributions: {
    callsByStatus: StatusDistributionItem[];
    followupsByStatus: StatusDistributionItem[];
    studentsByGroup: StudentsByGroupItem[];
  };
  trends: {
    callsTrend: CallsTrendItem[];
  };
  recentActivity: ActivityItemAPI[];
  callLists?: Array<{
    id: string;
    name: string;
    groupId: string | null;
    group: {
      id: string;
      name: string;
      batch: {
        id: string;
        name: string;
      } | null;
    } | null;
    itemCount: number;
    source: CallListSource;
    createdAt: string;
    updatedAt: string;
  }>;
}

// Frontend Component Types
export interface KPICardData {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
}

// Activity types match the frontend component expectation
export type ActivityType = 'user_added' | 'call_logged' | 'converted' | 'status_update';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string; // Relative time string like "30m ago"
}

export interface FollowUpItem {
  id: string;
  name: string;
  status: 'NEW' | 'IN_PROGRESS' | 'FOLLOW_UP';
  due: string; // Relative time string
  actionType?: 'call' | 'email' | 'whatsapp';
}

export interface ChartData {
  date?: string;
  name?: string;
  value: number;
}

