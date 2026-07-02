import { http, buildQueryString } from "./http";
import type { DashboardSummaryResponse } from "@/types/dashboard.types";

export const dashboardApi = {
  getDashboardSummary(filters?: {
    groupId?: string;
    batchId?: string;
    callerId?: string;
    dateFrom?: string;
    dateTo?: string;
    period?: "day" | "week" | "month" | "year";
  }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
      batchId: filters?.batchId,
      callerId: filters?.callerId,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      period: filters?.period,
    });
    return http.request<DashboardSummaryResponse>(`/dashboard${queryString}`, {
      method: "GET",
    });
  },

  getKPIs(filters?: {
    groupId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
    });
    return http.request<{
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
      };
      metrics: {
        conversionRate: number;
        averageCallsPerDay: number;
      };
    }>(`/dashboard/kpis${queryString}`, {
      method: "GET",
    });
  },

  getCallsByStatus(filters?: {
    groupId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
    });
    return http.request<Array<{ status: string; count: number }>>(
      `/dashboard/calls-by-status${queryString}`,
      {
        method: "GET",
      }
    );
  },

  getFollowupsByStatus(filters?: { groupId?: string }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
    });
    return http.request<Array<{ status: string; count: number }>>(
      `/dashboard/followups-by-status${queryString}`,
      {
        method: "GET",
      }
    );
  },

  getStudentsByGroup() {
    return http.request<Array<{ groupId: string; groupName: string; studentCount: number }>>(
      "/dashboard/students-by-group",
      {
        method: "GET",
      }
    );
  },

  getCallsTrend(period?: "day" | "week" | "month" | "year") {
    const queryString = buildQueryString({
      period: period,
    });
    return http.request<Array<{ date: string; count: number }>>(
      `/dashboard/calls-trend${queryString}`,
      {
        method: "GET",
      }
    );
  },

  getFollowupsTrend(filters?: {
    groupId?: string;
    batchId?: string;
    dateFrom?: string;
    dateTo?: string;
    period?: "day" | "week" | "month" | "year";
  }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
      batchId: filters?.batchId,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      period: filters?.period,
    });
    return http.request<Array<{ date: string; pending: number; overdue: number }>>(
      `/dashboard/followups-trend${queryString}`,
      {
        method: "GET",
      }
    );
  },

  getRecentActivity(limit?: number) {
    const queryString = buildQueryString({
      limit: limit,
    });
    return http.request<
      Array<{
        type: "call" | "followup";
        id: string;
        date: string;
        studentName: string;
        groupName: string;
        status: string;
        description: string;
      }>
    >(`/dashboard/recent-activity${queryString}`, {
      method: "GET",
    });
  },
};
