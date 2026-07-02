import { http } from "./http";
import type {
  Announcement,
  AnnouncementsListResponse,
} from "@/types/notifications.types";

export const platformApi = {
  platformOverview() {
    return http.request<{
      workspaces: number; members: number; students: number; callLists: number; callLogs: number;
    }>("/platform/overview", { method: "GET" });
  },
  platformListWorkspaces(query: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<{
      items: Array<{ id: string; name: string; plan: string; callSystemV2: boolean; memberCount: number; studentCount: number }>;
      page: number; size: number; total: number;
    }>(`/platform/workspaces${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  platformCreateWorkspace(body: {
    name: string; plan?: string; callSystemV2?: boolean;
    owner: { mode: "existing"; email: string } | { mode: "new"; email: string; name: string };
  }) {
    return http.request<{ id: string; name: string; tempPassword?: string }>("/platform/workspaces", {
      method: "POST", body: JSON.stringify(body),
    });
  },
  platformGetWorkspace(id: string) {
    return http.request<{
      id: string; name: string; plan: string; callSystemV2: boolean; timezone?: string;
      aiFeaturesEnabled: boolean; tasksEnabled: boolean; revenueEnabled: boolean;
      createdAt?: string;
      memberCount: number; studentCount: number;
      callListCount: number; callLogCount: number; callCount: number;
      members: Array<{ id: string; role: string; user: { id: string; email: string; name: string | null } }>;
    }>(`/platform/workspaces/${id}`, { method: "GET" });
  },
  platformUpdateWorkspace(id: string, body: { name?: string; plan?: string; callSystemV2?: boolean; aiFeaturesEnabled?: boolean; tasksEnabled?: boolean; revenueEnabled?: boolean }) {
    return http.request<{ id: string }>(`/platform/workspaces/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    });
  },
  platformDeleteWorkspace(id: string) {
    return http.request<{ id: string }>(`/platform/workspaces/${id}`, { method: "DELETE" });
  },
  platformListMembers(id: string) {
    return http.request<Array<{ id: string; role: string; user: { id: string; email: string; name: string | null } }>>(
      `/platform/workspaces/${id}/members`, { method: "GET" },
    );
  },
  platformAddMember(id: string, body: {
    role: string;
    user: { mode: "existing"; email: string } | { mode: "new"; email: string; name: string };
  }) {
    return http.request<{ id: string; tempPassword?: string }>(`/platform/workspaces/${id}/members`, {
      method: "POST", body: JSON.stringify(body),
    });
  },
  platformChangeMemberRole(memberId: string, role: string) {
    return http.request<{ id: string }>(`/platform/members/${memberId}`, {
      method: "PATCH", body: JSON.stringify({ role }),
    });
  },
  platformListUsers(query: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<{
      items: Array<{
        id: string; email: string; name: string | null; isSuperAdmin: boolean;
        disabledAt: string | null; createdAt: string; workspaceCount: number;
      }>;
      page: number; size: number; total: number;
    }>(`/platform/users${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  platformSetSuperAdmin(id: string, isSuperAdmin: boolean) {
    return http.request<{ id: string }>(`/platform/users/${id}/super-admin`, {
      method: "PATCH", body: JSON.stringify({ isSuperAdmin }),
    });
  },
  platformSetUserStatus(id: string, active: boolean) {
    return http.request<{ id: string }>(`/platform/users/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ active }),
    });
  },
  platformResetUserPassword(id: string) {
    return http.request<{ id: string; tempPassword: string }>(`/platform/users/${id}/reset-password`, {
      method: "POST",
    });
  },
  platformListAudit(query: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<{
      items: Array<{
        id: string; action: string; targetType: string; targetId: string | null;
        metadata: unknown; createdAt: string;
        actor: { id: string; email: string; name: string | null } | null;
      }>;
      page: number; size: number; total: number;
    }>(`/platform/audit${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  platformCreateAnnouncement(data: { title: string; body: string; targetType: 'ALL' | 'SELECTED'; workspaceIds?: string[] }) {
    return http.request<Announcement>("/platform/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  platformListAnnouncements(query: { page?: number; size?: number } = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<AnnouncementsListResponse>(`/platform/announcements${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  platformListDeletedWorkspaces() {
    return http.request<Array<{
      id: string; name: string; plan: string; deletedAt: string;
      memberCount: number; studentCount: number;
    }>>(`/platform/deleted-workspaces`, { method: "GET" });
  },
  platformRestoreWorkspace(id: string) {
    return http.request<{ id: string }>(`/platform/workspaces/${id}/restore`, { method: "POST" });
  },
  platformGetUser(id: string) {
    return http.request<{
      id: string; email: string; name: string | null; isSuperAdmin: boolean;
      disabledAt: string | null; createdAt: string;
      workspaces: Array<{ id: string; name: string; role: string; plan: string }>;
      feedback: Array<{
        id: string; type: string; status: string; message: string;
        reply: string | null; repliedAt: string | null; createdAt: string;
      }>;
      health: { isDeactivated: boolean; isPendingSetup: boolean; noWorkspace: boolean; hasOpenFeedback: boolean };
    }>(`/platform/users/${id}`, { method: "GET" });
  },
  platformUpdateUser(id: string, body: { name: string }) {
    return http.request<{ id: string }>(`/platform/users/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    });
  },
  platformListFeedback(query: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<{
      items: Array<{
        id: string; type: string; status: string; message: string;
        reply: string | null; repliedAt: string | null; createdAt: string;
        user: { id: string; email: string; name: string | null };
      }>;
      page: number; size: number; total: number;
    }>(`/platform/feedback${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  platformReplyFeedback(id: string, reply: string) {
    return http.request<{ id: string }>(`/platform/feedback/${id}/reply`, {
      method: "PATCH", body: JSON.stringify({ reply }),
    });
  },
  platformSetFeedbackStatus(id: string, status: "OPEN" | "RESOLVED") {
    return http.request<{ id: string }>(`/platform/feedback/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
  },
  getPlatformFeatures() {
    return http.request<{ features: Record<string, boolean> }>(`/platform/features`, { method: "GET" });
  },
  updatePlatformFeatures(feature: string, enabled: boolean) {
    return http.request<{ features: Record<string, boolean> }>(`/platform/features`, {
      method: "PATCH", body: JSON.stringify({ feature, enabled }),
    });
  },
  getPlatformFeaturesWorkspaces(query: Record<string, string | number | undefined> = {}) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.request<{
      items: Array<{ id: string; name: string; aiFeaturesEnabled: boolean; tasksEnabled: boolean; revenueEnabled: boolean }>;
      page: number; size: number; total: number;
    }>(`/platform/features/workspaces${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getWorkspacePlatformFeatures() {
    return http.request<{ features: Record<string, boolean> }>(`/workspace/platform-features`, { method: "GET" });
  },
};
