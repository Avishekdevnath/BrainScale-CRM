import { http } from "./http";

export const workspacesApi = {
  getWorkspaces() {
    return http.request<
      Array<{
        id: string;
        name: string;
        logo: string | null;
        plan: "FREE" | "PRO" | "BUSINESS";
        timezone: string;
        role: "ADMIN" | "MEMBER";
        memberCount: number;
        groupCount: number;
        studentCount: number;
        createdAt: string;
      }>
    >("/workspaces", {
      method: "GET",
    });
  },

  createWorkspace(data: { name: string; logo?: string; timezone?: string }) {
    return http.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      createdAt: string;
      updatedAt: string;
      accessToken?: string;
    }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getWorkspace(workspaceId: string) {
    return http.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      aiFeaturesEnabled: boolean;
      aiFeatures: string[] | null;
      tasksEnabled: boolean;
      revenueEnabled: boolean;
      callsEnabled: boolean;
      followupsEnabled: boolean;
      groupsEnabled: boolean;
      learningEnabled: boolean;
      teamChatEnabled: boolean;
      formsEnabled: boolean;
      createdAt: string;
      updatedAt: string;
    }>(`/workspaces/${workspaceId}`, {
      method: "GET",
    });
  },

  updateWorkspace(workspaceId: string, data: {
    name?: string;
    logo?: string | null;
    timezone?: string;
    dailyDigestEnabled?: boolean;
    dailyDigestTime?: string;
    weeklyDigestEnabled?: boolean;
    weeklyDigestDay?: string;
    weeklyDigestTime?: string;
    followupRemindersEnabled?: boolean;
    aiFeaturesEnabled?: boolean;
    aiFeatures?: string[];
    tasksEnabled?: boolean;
    revenueEnabled?: boolean;
    callsEnabled?: boolean;
    followupsEnabled?: boolean;
    groupsEnabled?: boolean;
    learningEnabled?: boolean;
    teamChatEnabled?: boolean;
    formsEnabled?: boolean;
  }) {
    return http.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      aiFeaturesEnabled: boolean;
      aiFeatures: string[] | null;
      tasksEnabled: boolean;
      revenueEnabled: boolean;
      callsEnabled: boolean;
      followupsEnabled: boolean;
      groupsEnabled: boolean;
      learningEnabled: boolean;
      teamChatEnabled: boolean;
      formsEnabled: boolean;
      createdAt: string;
      updatedAt: string;
    }>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteWorkspace(workspaceId: string) {
    return http.request<{ message: string }>(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
  },

  getCurrentWorkspaceMember(workspaceId: string) {
    return http.request<import("@/types/call-lists.types").CurrentWorkspaceMember>(
      `/workspaces/${workspaceId}/members/me`,
      { method: "GET" }
    );
  },
};
