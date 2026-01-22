import type {
  StudentsListParams,
  StudentsListResponse,
  BulkPasteRequest,
  BulkPasteResponse,
  ExportCSVParams,
  StudentDetail,
  UpdateStudentPayload,
} from "@/types/students.types";
import type {
  Batch,
  BatchListParams,
  BatchListResponse,
  CreateBatchPayload,
  UpdateBatchPayload,
  BatchStatsResponse,
  StudentBatch,
  AddStudentToBatchPayload,
  SetStudentBatchesPayload,
} from "@/types/batches.types";
import type {
  CallList,
  CallListItem,
  CreateCallListPayload,
  UpdateCallListPayload,
  CallListsListParams,
  CallListsListResponse,
  CallListItemsListParams,
  CallListItemsListResponse,
  AddCallListItemsPayload,
  BulkPasteCallListRequest,
  BulkPasteCallListResponse,
  UpdateCallListItemPayload,
  AssignCallListItemsPayload,
  UnassignCallListItemsPayload,
  RemoveCallListItemsPayload,
  CallLog,
  CreateCallLogRequest,
  UpdateCallLogRequest,
  CallLogsResponse,
  GetCallLogsParams,
  GetMyCallsParams,
  MyCallsResponse,
  MyCallsStats,
  GetMyCallHistoryParams,
  Question,
  ImportPreviewResponse,
  CommitImportRequest,
  CommitImportResponse,
  StartImportCommitResponse,
  ProcessImportCommitRequest,
  ProcessImportCommitResponse,
  BulkEmailPasteRequest,
  BulkEmailPasteResponse,
} from "@/types/call-lists.types";
import type { BulkDeleteStudentsPayload, BulkDeleteStudentsResponse } from "@/types/students.types";
import {
  Chat,
  ChatMessage,
  SendMessageRequest,
  SendMessageResponse,
  ChatHistoryResponse,
  ChatListResponse,
  CreateChatRequest,
  UpdateChatRequest,
  ExportChatHistoryOptions,
  ExportAIDataOptions,
} from "@/types/ai-chat.types";
import type {
  WorkspaceMember,
  Invitation,
  GetMembersResponse,
  InviteMemberPayload,
  UpdateMemberPayload,
  GrantGroupAccessPayload,
  CreateMemberWithAccountPayload,
  SendInvitationPayload,
  ListInvitationsResponse,
  GetInvitationByTokenResponse,
} from "@/types/members.types";
import type {
  RequestPasswordChangeOtpPayload,
  RequestPasswordChangeOtpResponse,
  ChangePasswordOtpPayload,
  ChangePasswordOtpResponse,
  ResendPasswordChangeOtpPayload,
  ResendPasswordChangeOtpResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  ResendResetPasswordOtpPayload,
  ResendResetPasswordOtpResponse,
} from "@/types/password.types";
import type { DashboardSummaryResponse } from "@/types/dashboard.types";
import type {
  Followup,
  ListFollowupsParams,
  FollowupsListResponse,
  FollowupCallContext,
  CreateFollowupCallLogRequest,
} from "@/types/followups.types";
import type {
  CustomRole,
  CustomRolesResponse,
  CreateRolePayload,
  UpdateRolePayload,
  AssignPermissionsPayload,
  PermissionsResponse,
} from "@/types/roles.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Get workspace ID from store (lazy loaded to avoid circular dependencies)
function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const { useWorkspaceStore } = require("@/store/workspace");
    return useWorkspaceStore.getState().getCurrentId();
  } catch {
    return null;
  }
}

// Helper function to build query string from filters
function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export class ApiClient {
  private get accessToken(): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    } catch {
      return null;
    }
  }

  private get refreshToken(): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    // Don't set Content-Type for FormData - browser needs to set it with boundary
    const isFormData = init.body instanceof FormData;
    const headers: HeadersInit = {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Add X-Workspace-Id header if workspace ID is available
    const workspaceId = getWorkspaceId();
    if (workspaceId) {
      (headers as Record<string, string>)["X-Workspace-Id"] = workspaceId;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers });
    if (res.status === 401 && this.refreshToken) {
      // Try refresh once
      await this.refreshAccessToken();
      const retryHeaders: HeadersInit = {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      };
      const newAccess = this.accessToken;
      if (newAccess) {
        (retryHeaders as Record<string, string>)["Authorization"] = `Bearer ${newAccess}`;
      }
      // Add workspace ID to retry headers as well
      if (workspaceId) {
        (retryHeaders as Record<string, string>)["X-Workspace-Id"] = workspaceId;
      }
      const retry = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers: retryHeaders });
      if (!retry.ok) throw await this.parseError(retry);
      return retry.json();
    }
    if (!res.ok) throw await this.parseError(res);
    return res.json();
  }

  private async requestBlob(endpoint: string, init: RequestInit = {}): Promise<Blob> {
    const headers: HeadersInit = {
      ...(init.headers || {}),
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Add X-Workspace-Id header if workspace ID is available
    const workspaceId = getWorkspaceId();
    if (workspaceId) {
      (headers as Record<string, string>)["X-Workspace-Id"] = workspaceId;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers });
    if (res.status === 401 && this.refreshToken) {
      // Try refresh once
      await this.refreshAccessToken();
      const retryHeaders: HeadersInit = {
        ...(init.headers || {}),
      };
      const newAccess = this.accessToken;
      if (newAccess) {
        (retryHeaders as Record<string, string>)["Authorization"] = `Bearer ${newAccess}`;
      }
      // Add workspace ID to retry headers as well
      if (workspaceId) {
        (retryHeaders as Record<string, string>)["X-Workspace-Id"] = workspaceId;
      }
      const retry = await fetch(`${API_BASE_URL}${endpoint}`, { ...init, headers: retryHeaders });
      if (!retry.ok) throw await this.parseError(retry);
      return retry.blob();
    }
    if (!res.ok) throw await this.parseError(res);
    return res.blob();
  }

  private async parseError(res: Response): Promise<Error & { status?: number; retryAfter?: number; canRetryAt?: string }> {
    try {
      const data = await res.json();
      const message = data?.error?.message || data?.message || res.statusText;
      const error = new Error(message) as Error & { status?: number; retryAfter?: number; canRetryAt?: string };
      error.status = res.status;
      
      // Extract retry metadata from 429 errors
      if (res.status === 429 && data?.error) {
        error.retryAfter = data.error.retryAfter;
        error.canRetryAt = data.error.canRetryAt;
      }
      
      return error;
    } catch {
      const error = new Error(res.statusText) as Error & { status?: number };
      error.status = res.status;
      return error;
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error("No refresh token");
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST" satisfies HttpMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (!res.ok) throw await this.parseError(res);
    const data = (await res.json()) as { accessToken: string };
    try {
      localStorage.setItem("accessToken", data.accessToken);
    } catch {}
  }

  // Auth
  login(body: { email: string; password: string }) {
    return this.request<{ accessToken: string; refreshToken: string; user: any; workspace: any }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    );
  }
  signup(body: { email: string; password: string; name?: string }) {
    return this.request<{
      user: {
        id: string;
        email: string;
        name: string | null;
        emailVerified: boolean;
        createdAt: string;
      };
      invitation: any | null;
      emailSent: boolean;
      message: string;
      actionRequired?: string[];
      retryAfter?: number;
      canRetryAt?: string;
      resendEndpoints?: {
        email: string;
        otp: string;
      };
    }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  verifyEmail(token: string) {
    return this.request<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  verifyEmailOtp(body: { email: string; otp: string }) {
    return this.request<{ message: string }>("/auth/verify-email-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  resendVerificationEmail(email: string) {
    return this.request<{ message: string; canRetryAfter: number }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  resendVerificationOtp(body: { email: string }) {
    return this.request<{ message: string; canRetryAfter: number }>("/auth/resend-verification-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Signup-specific verification endpoints (separate from general verification)
  verifySignupEmail(token: string) {
    return this.request<{ message: string }>("/auth/verify-signup-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  verifySignupOtp(body: { email: string; otp: string }) {
    return this.request<{ message: string }>("/auth/verify-signup-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  resendSignupVerification(email: string) {
    return this.request<{ message: string; canRetryAfter?: number }>("/auth/resend-signup-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // Dashboard methods
  getDashboardSummary(filters?: {
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
    return this.request<DashboardSummaryResponse>(`/dashboard${queryString}`, {
      method: "GET",
    });
  }

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
    return this.request<{
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
  }

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
    return this.request<Array<{ status: string; count: number }>>(
      `/dashboard/calls-by-status${queryString}`,
      {
        method: "GET",
      }
    );
  }

  getFollowupsByStatus(filters?: { groupId?: string }) {
    const queryString = buildQueryString({
      groupId: filters?.groupId,
    });
    return this.request<Array<{ status: string; count: number }>>(
      `/dashboard/followups-by-status${queryString}`,
      {
        method: "GET",
      }
    );
  }

  getStudentsByGroup() {
    return this.request<Array<{ groupId: string; groupName: string; studentCount: number }>>(
      "/dashboard/students-by-group",
      {
        method: "GET",
      }
    );
  }

  getCallsTrend(period?: "day" | "week" | "month" | "year") {
    const queryString = buildQueryString({
      period: period,
    });
    return this.request<Array<{ date: string; count: number }>>(
      `/dashboard/calls-trend${queryString}`,
      {
        method: "GET",
      }
    );
  }

  getRecentActivity(limit?: number) {
    const queryString = buildQueryString({
      limit: limit,
    });
    return this.request<
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
  }

  // Workspace methods
  getWorkspaces() {
    return this.request<
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
  }

  createWorkspace(data: { name: string; logo?: string; timezone?: string }) {
    return this.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      createdAt: string;
      updatedAt: string;
      accessToken?: string;
      refreshToken?: string;
    }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getWorkspace(workspaceId: string) {
    return this.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      aiFeaturesEnabled: boolean;
      aiFeatures: string[] | null;
      createdAt: string;
      updatedAt: string;
    }>(`/workspaces/${workspaceId}`, {
      method: "GET",
    });
  }

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
  }) {
    return this.request<{
      id: string;
      name: string;
      logo: string | null;
      plan: "FREE" | "PRO" | "BUSINESS";
      timezone: string;
      aiFeaturesEnabled: boolean;
      aiFeatures: string[] | null;
      createdAt: string;
      updatedAt: string;
    }>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  getCurrentWorkspaceMember(workspaceId: string) {
    return this.request<{
      id: string;
      userId: string;
      workspaceId: string;
      role: string;
      createdAt: string;
      updatedAt: string;
    }>(`/workspaces/${workspaceId}/members/me`, {
      method: "GET",
    });
  }

  // Member Management methods
  getWorkspaceMembers(workspaceId: string) {
    return this.request<GetMembersResponse>(`/workspaces/${workspaceId}/members`, {
      method: "GET",
    });
  }

  inviteMember(workspaceId: string, data: InviteMemberPayload) {
    return this.request<WorkspaceMember>(`/workspaces/${workspaceId}/members/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createMemberWithAccount(workspaceId: string, data: CreateMemberWithAccountPayload) {
    return this.request<{
      member: WorkspaceMember;
      message: string;
    }>(`/workspaces/${workspaceId}/members/create`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateMember(workspaceId: string, memberId: string, data: UpdateMemberPayload) {
    return this.request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  grantGroupAccess(workspaceId: string, memberId: string, data: GrantGroupAccessPayload) {
    return this.request<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${memberId}/groups`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  removeMember(workspaceId: string, memberId: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  // Invitation methods
  sendInvitation(workspaceId: string, data: SendInvitationPayload) {
    return this.request<{
      id: string;
      email: string;
      role: string;
      customRole: { id: string; name: string; description: string | null } | null;
      expiresAt: string;
      status: string;
      message: string;
    }>(`/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  listInvitations(workspaceId: string) {
    return this.request<ListInvitationsResponse>(`/workspaces/${workspaceId}/invitations`, {
      method: "GET",
    });
  }

  cancelInvitation(workspaceId: string, invitationId: string) {
    return this.request<{ message: string }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  }

  getInvitationByToken(token: string) {
    // Public endpoint - no workspace header needed
    // Override the request method to exclude workspace header
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return fetch(`${API_BASE_URL}/invitations/${token}`, {
      method: "GET",
      headers,
    }).then(async (res) => {
      if (!res.ok) throw await this.parseError(res);
      return res.json() as Promise<GetInvitationByTokenResponse>;
    });
  }

  // Password Management methods
  requestPasswordChangeOtp(email: string) {
    return this.request<RequestPasswordChangeOtpResponse>("/auth/request-password-change-otp", {
      method: "POST",
      body: JSON.stringify({ email } as RequestPasswordChangeOtpPayload),
    });
  }

  changePasswordWithOtp(email: string, otp: string, newPassword: string) {
    return this.request<ChangePasswordOtpResponse>("/auth/change-password-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword } as ChangePasswordOtpPayload),
    });
  }

  resendPasswordChangeOtp(email: string) {
    return this.request<ResendPasswordChangeOtpResponse>("/auth/resend-password-change-otp", {
      method: "POST",
      body: JSON.stringify({ email } as ResendPasswordChangeOtpPayload),
    });
  }

  forgotPassword(email: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email } as ForgotPasswordPayload),
    }).then(async (res) => {
      if (!res.ok) throw await this.parseError(res);
      return res.json() as Promise<ForgotPasswordResponse>;
    });
  }

  resetPassword(email: string, otp: string, newPassword: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, otp, newPassword } as ResetPasswordPayload),
    }).then(async (res) => {
      if (!res.ok) throw await this.parseError(res);
      return res.json() as Promise<ResetPasswordResponse>;
    });
  }

  resendResetPasswordOtp(email: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/resend-reset-password-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email } as ResendResetPasswordOtpPayload),
    }).then(async (res) => {
      if (!res.ok) throw await this.parseError(res);
      return res.json() as Promise<ResendResetPasswordOtpResponse>;
    });
  }

  // Groups methods
  getGroups(params?: { batchId?: string; isActive?: boolean }) {
    const queryString = buildQueryString({
      batchId: params?.batchId,
      isActive: params?.isActive,
    });
    return this.request<
      Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId?: string | null;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        } | null;
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>
    >(`/groups${queryString}`, {
      method: "GET",
    });
  }

  createGroup(data: { name: string; isActive?: boolean; batchId?: string | null }) {
    return this.request<{
      id: string;
      name: string;
      isActive: boolean;
      workspaceId: string;
      batchId?: string | null;
      batch?: {
        id: string;
        name: string;
        isActive: boolean;
      } | null;
      createdAt: string;
      updatedAt: string;
      _count: {
        enrollments: number;
        calls: number;
        followups: number;
      };
    }>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getGroupById(groupId: string) {
    return this.request<{
      id: string;
      name: string;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        enrollments: number;
        calls: number;
        followups: number;
        callLists: number;
      };
    }>(`/groups/${groupId}`, {
      method: "GET",
    });
  }

  updateGroup(groupId: string, data: { name?: string; isActive?: boolean; batchId?: string | null }) {
    return this.request<{
      id: string;
      name: string;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        enrollments: number;
        calls: number;
        followups: number;
      };
    }>(`/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteGroup(groupId: string) {
    return this.request<{
      message: string;
    }>(`/groups/${groupId}`, {
      method: "DELETE",
    });
  }

  getGroupCalls(
    groupId: string,
    params?: {
      page?: number;
      size?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      startDate: params?.startDate,
      endDate: params?.endDate,
    });
    return this.request<{
      calls: Array<{
        id: string;
        callStatus: string;
        callDate: string;
        notes: string | null;
        studentId: string;
        groupId: string;
        assignedTo: string | null;
        createdAt: string;
        updatedAt: string;
        student: {
          id: string;
          name: string;
          email: string;
        };
        creator: {
          id: string;
          name: string;
          email: string;
        };
      }>;
      pagination: {
        page: number;
        size: number;
        total: number;
        totalPages: number;
      };
    }>(`/groups/${groupId}/calls${queryString}`, {
      method: "GET",
    });
  }

  getGroupFollowups(
    groupId: string,
    params?: {
      page?: number;
      size?: number;
      status?: string;
      assignedTo?: string;
      startDate?: string;
      endDate?: string;
      callListId?: string;
    }
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      status: params?.status,
      assignedTo: params?.assignedTo,
      startDate: params?.startDate,
      endDate: params?.endDate,
      callListId: params?.callListId,
    });
    return this.request<{
      followups: Array<{
        id: string;
        status: string;
        dueAt: string;
        notes: string | null;
        studentId: string;
        groupId: string;
        assignedTo: string | null;
        createdAt: string;
        updatedAt: string;
        isOverdue: boolean;
        student: {
          id: string;
          name: string;
          email: string;
        };
        creator: {
          id: string;
          name: string;
          email: string;
        };
        assignee: {
          id: string;
          user: {
            id: string;
            name: string;
            email: string;
          };
        } | null;
      }>;
      pagination: {
        page: number;
        size: number;
        total: number;
        totalPages: number;
      };
    }>(`/groups/${groupId}/followups${queryString}`, {
      method: "GET",
    });
  }

  // Courses methods
  getCourses() {
    return this.request<
      Array<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        workspaceId: string;
        createdAt: string;
        updatedAt: string;
        _count: {
          modules: number;
          enrollments: number;
        };
      }>
    >("/courses", {
      method: "GET",
    });
  }

  createCourse(data: { name: string; description?: string | null; isActive?: boolean }) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        modules: number;
        enrollments: number;
      };
    }>("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getCourseById(courseId: string) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      modules: Array<{
        id: string;
        name: string;
        description: string | null;
        orderIndex: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          progress: number;
        };
      }>;
      _count: {
        enrollments: number;
      };
    }>(`/courses/${courseId}`, {
      method: "GET",
    });
  }

  updateCourse(
    courseId: string,
    data: { name?: string; description?: string | null; isActive?: boolean }
  ) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workspaceId: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        modules: number;
        enrollments: number;
      };
    }>(`/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteCourse(courseId: string) {
    return this.request<{
      message: string;
    }>(`/courses/${courseId}`, {
      method: "DELETE",
    });
  }

  getCourseModules(courseId: string) {
    return this.request<
      Array<{
        id: string;
        name: string;
        description: string | null;
        orderIndex: number;
        isActive: boolean;
        courseId: string;
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          progress: number;
        };
      }>
    >(`/courses/${courseId}/modules`, {
      method: "GET",
    });
  }

  // Modules methods
  createModule(data: {
    courseId: string;
    name: string;
    description?: string | null;
    orderIndex?: number;
    isActive?: boolean;
  }) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>("/modules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getModule(moduleId: string) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>(`/modules/${moduleId}`, {
      method: "GET",
    });
  }

  updateModule(
    moduleId: string,
    data: {
      name?: string;
      description?: string | null;
      orderIndex?: number;
      isActive?: boolean;
    }
  ) {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      orderIndex: number;
      isActive: boolean;
      courseId: string;
      createdAt: string;
      updatedAt: string;
      course: {
        id: string;
        name: string;
      };
      _count: {
        enrollments: number;
        progress: number;
      };
    }>(`/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteModule(moduleId: string) {
    return this.request<{
      message: string;
    }>(`/modules/${moduleId}`, {
      method: "DELETE",
    });
  }

  // Batch methods
  createBatch(payload: CreateBatchPayload) {
    return this.request<Batch>("/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  listBatches(params?: BatchListParams) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      isActive: params?.isActive,
    });
    return this.request<BatchListResponse>(`/batches${queryString}`, {
      method: "GET",
    });
  }

  getBatch(batchId: string) {
    return this.request<Batch>(`/batches/${batchId}`, {
      method: "GET",
    });
  }

  updateBatch(batchId: string, payload: UpdateBatchPayload) {
    return this.request<Batch>(`/batches/${batchId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  deleteBatch(batchId: string) {
    return this.request<{ message: string }>(`/batches/${batchId}`, {
      method: "DELETE",
    });
  }

  getBatchStats(batchId: string) {
    return this.request<BatchStatsResponse>(`/batches/${batchId}/stats`, {
      method: "GET",
    });
  }

  // Batch-Group Alignment methods
  alignGroupsToBatch(batchId: string, groupIds: string[]) {
    return this.request<{
      updated: number;
      groups: Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>;
    }>(`/batches/${batchId}/groups`, {
      method: "POST",
      body: JSON.stringify({ groupIds }),
    });
  }

  removeGroupsFromBatch(batchId: string, groupIds: string[]) {
    return this.request<{
      removed: number;
      groups: Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string | null;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        } | null;
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>;
    }>(`/batches/${batchId}/groups`, {
      method: "DELETE",
      body: JSON.stringify({ groupIds }),
    });
  }

  getGroupsByBatch(batchId: string) {
    return this.request<
      Array<{
        id: string;
        name: string;
        isActive: boolean;
        workspaceId: string;
        batchId: string;
        batch?: {
          id: string;
          name: string;
          isActive: boolean;
        };
        createdAt: string;
        updatedAt: string;
        _count: {
          enrollments: number;
          calls: number;
          followups: number;
        };
      }>
    >(`/batches/${batchId}/groups`, {
      method: "GET",
    });
  }

  // Student-Batch Association methods
  addStudentToBatch(studentId: string, payload: AddStudentToBatchPayload) {
    return this.request<StudentBatch>(`/students/${studentId}/batches`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getStudentBatches(studentId: string) {
    return this.request<StudentBatch[]>(`/students/${studentId}/batches`, {
      method: "GET",
    });
  }

  setStudentBatches(studentId: string, payload: SetStudentBatchesPayload) {
    return this.request<{ message: string; batches: StudentBatch[] }>(
      `/students/${studentId}/batches`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
  }

  removeStudentFromBatch(studentId: string, batchId: string) {
    return this.request<{ message: string }>(
      `/students/${studentId}/batches/${batchId}`,
      {
        method: "DELETE",
      }
    );
  }

  // Call List Management methods
  createCallList(payload: CreateCallListPayload) {
    // Prepare meta object with questions if provided
    const meta: Record<string, any> = payload.meta || {};
    if (payload.questions && payload.questions.length > 0) {
      meta.questions = payload.questions;
    }

    // Prepare request payload
    const requestPayload: any = {
      name: payload.name,
      source: payload.source,
      description: payload.description,
      groupId: payload.groupId,
      batchId: payload.batchId,
      studentIds: payload.studentIds,
      studentsData: payload.studentsData,
      groupIds: payload.groupIds,
      messages: payload.messages || [],
      matchBy: payload.matchBy,
      skipDuplicates: payload.skipDuplicates,
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    };

    return this.request<CallList>("/call-lists", {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });
  }

  async getCallLists(params?: CallListsListParams): Promise<CallListsListResponse> {
    const queryString = buildQueryString({
      groupId: params?.groupId,
      batchId: params?.batchId,
      status: params?.status,
      page: params?.page,
      size: params?.size,
    });
    // API returns array directly, transform to expected response format
    const response = await this.request<CallList[]>(`/call-lists${queryString}`, {
      method: "GET",
    });
    // Transform array response to object format expected by frontend
    return {
      callLists: response,
      pagination: {
        page: params?.page || 1,
        size: params?.size || response.length,
        total: response.length,
        totalPages: 1,
      },
    };
  }

  async markCallListComplete(callListId: string): Promise<CallList> {
    return this.request<CallList>(`/call-lists/${callListId}/complete`, {
      method: "PATCH",
    });
  }

  async markCallListActive(callListId: string): Promise<CallList> {
    return this.request<CallList>(`/call-lists/${callListId}/reopen`, {
      method: "PATCH",
    });
  }

  getCallListById(listId: string) {
    return this.request<CallList>(`/call-lists/${listId}`, {
      method: "GET",
    });
  }

  // Get call list details with questions extracted from meta
  async getCallListDetails(listId: string): Promise<CallList> {
    const callList = await this.request<CallList>(`/call-lists/${listId}`, {
      method: "GET",
    });
    // The backend extracts questions from meta.questions, so we should receive them directly
    return callList;
  }

  updateCallList(listId: string, payload: UpdateCallListPayload) {
    // Prepare meta object with questions if provided
    const meta: Record<string, any> = payload.meta || {};
    if (payload.questions && payload.questions.length > 0) {
      meta.questions = payload.questions;
    }

    // Prepare request payload
    const requestPayload: any = {
      name: payload.name,
      description: payload.description,
      messages: payload.messages,
      status: payload.status,
    };

    if (Object.keys(meta).length > 0 || payload.meta) {
      requestPayload.meta = Object.keys(meta).length > 0 ? meta : payload.meta;
    }

    return this.request<CallList>(`/call-lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(requestPayload),
    });
  }

  deleteCallList(listId: string) {
    return this.request<{ message: string }>(`/call-lists/${listId}`, {
      method: "DELETE",
    });
  }

  // Call List Items methods
  addCallListItems(listId: string, payload: AddCallListItemsPayload) {
    return this.request<{ added: number; items: CallListItem[] }>(
      `/call-lists/${listId}/items`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  getCallListItems(listId: string, params?: CallListItemsListParams) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      state: params?.state,
      assignedTo: params?.assignedTo,
      callLogStatus: params?.callLogStatus,
      followUpRequired: params?.followUpRequired,
    });
    return this.request<CallListItemsListResponse>(
      `/call-lists/${listId}/items${queryString}`,
      {
        method: "GET",
      }
    );
  }

  // Preview import file
  async previewCallListImport(callListId: string, file: File): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request<ImportPreviewResponse>(
      `/call-lists/${callListId}/import/preview`,
      {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header, browser will set it with boundary
      }
    );
  }

  // Commit import with column mapping
  commitCallListImport(callListId: string, data: CommitImportRequest): Promise<CommitImportResponse> {
    return this.request<CommitImportResponse>(
      `/call-lists/${callListId}/import/commit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  startCallListImportCommit(callListId: string, data: CommitImportRequest): Promise<StartImportCommitResponse> {
    return this.request<StartImportCommitResponse>(
      `/call-lists/${callListId}/import/commit/start`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  processCallListImportCommit(callListId: string, data: ProcessImportCommitRequest): Promise<ProcessImportCommitResponse> {
    return this.request<ProcessImportCommitResponse>(
      `/call-lists/${callListId}/import/commit/process`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  // Bulk paste emails to call list
  bulkPasteEmailsToCallList(callListId: string, data: BulkEmailPasteRequest): Promise<BulkEmailPasteResponse> {
    return this.request<BulkEmailPasteResponse>(
      `/call-lists/${callListId}/bulk-paste-emails`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Create call list from bulk pasted data
  bulkPasteCallList(data: BulkPasteCallListRequest): Promise<BulkPasteCallListResponse> {
    return this.request<BulkPasteCallListResponse>(
      '/call-lists/bulk-paste',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  getAvailableStudents(
    listId: string,
    params?: {
      page?: number;
      size?: number;
      q?: string;
      batchId?: string;
      courseId?: string;
      moduleId?: string;
      status?: string;
    }
  ) {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      courseId: params?.courseId,
      moduleId: params?.moduleId,
      status: params?.status,
    });
    return this.request<StudentsListResponse>(
      `/call-lists/${listId}/available-students${queryString}`,
      {
        method: "GET",
      }
    );
  }

  updateCallListItem(itemId: string, payload: UpdateCallListItemPayload) {
    return this.request<CallListItem>(`/call-list-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  deleteCallListItem(itemId: string) {
    return this.request<{ message: string; deletedItem: { id: string; studentName?: string } }>(
      `/call-list-items/${itemId}`,
      {
        method: "DELETE",
      }
    );
  }

  assignCallListItems(listId: string, payload: AssignCallListItemsPayload) {
    return this.request<{ message: string; assignedCount: number }>(
      `/call-lists/${listId}/items/assign`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  }

  unassignCallListItems(listId: string, payload: UnassignCallListItemsPayload) {
    return this.request<{ message: string; unassignedCount: number }>(
      `/call-lists/${listId}/items/unassign`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  }

  removeCallListItems(listId: string, payload: RemoveCallListItemsPayload) {
    return this.request<{ message: string; removedCount: number }>(
      `/call-lists/${listId}/items/remove`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  // My Calls methods
  getMyCalls(params?: GetMyCallsParams): Promise<MyCallsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      groupId: params?.groupId,
      callListId: params?.callListId,
      state: params?.state,
      followUpRequired: params?.followUpRequired,
    });
    return this.request<MyCallsResponse>(`/my-calls${queryString}`, {
      method: "GET",
    });
  }

  getAllCalls(params?: GetMyCallsParams): Promise<MyCallsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      q: params?.q,
      batchId: params?.batchId,
      groupId: params?.groupId,
      callListId: params?.callListId,
      state: params?.state,
      followUpRequired: params?.followUpRequired,
    });
    return this.request<MyCallsResponse>(`/my-calls/all${queryString}`, {
      method: "GET",
    });
  }

  getMyCallsStats(): Promise<MyCallsStats> {
    return this.request<MyCallsStats>("/my-calls/stats", {
      method: "GET",
    });
  }

  getMyCallHistory(params?: GetMyCallHistoryParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      callListId: params?.callListId,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    });
    return this.request<CallLogsResponse>(`/my-calls/history${queryString}`, {
      method: "GET",
    });
  }

  // Call Log methods
  createCallLog(payload: CreateCallLogRequest) {
    return this.request<CallLog>("/call-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getCallLog(logId: string) {
    return this.request<CallLog>(`/call-logs/${logId}`, {
      method: "GET",
    });
  }

  updateCallLog(logId: string, payload: UpdateCallLogRequest) {
    return this.request<CallLog>(`/call-logs/${logId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  // Follow-ups methods
  listFollowups(params?: ListFollowupsParams): Promise<FollowupsListResponse> {
    const queryString = buildQueryString({
      callListId: params?.callListId,
      status: params?.status,
      assignedTo: params?.assignedTo,
      groupId: params?.groupId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      page: params?.page,
      size: params?.size,
    });
    return this.request<FollowupsListResponse>(`/followups${queryString}`, {
      method: "GET",
    });
  }

  getFollowupCallContext(followupId: string): Promise<FollowupCallContext> {
    return this.request<FollowupCallContext>(`/followups/${followupId}/call-context`, {
      method: "GET",
    });
  }

  createFollowupCallLog(data: CreateFollowupCallLogRequest): Promise<CallLog> {
    return this.request<CallLog>("/call-logs/followup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getCallLogs(params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      callListId: params?.callListId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
    });
    return this.request<CallLogsResponse>(`/call-logs${queryString}`, {
      method: "GET",
    });
  }

  getStudentCallLogs(studentId: string, params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      callListId: params?.callListId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
    });
    return this.request<CallLogsResponse>(`/call-logs/students/${studentId}/call-logs${queryString}`, {
      method: "GET",
    });
  }

  getCallListCallLogs(callListId: string, params?: GetCallLogsParams): Promise<CallLogsResponse> {
    const queryString = buildQueryString({
      page: params?.page,
      size: params?.size,
      studentId: params?.studentId,
      assignedTo: params?.assignedTo,
      status: params?.status,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      batchId: params?.batchId,
      groupId: params?.groupId,
    });
    return this.request<CallLogsResponse>(`/call-lists/${callListId}/call-logs${queryString}`, {
      method: "GET",
    });
  }

  // Students methods
  getStudents(params?: StudentsListParams) {
    const queryString = buildQueryString({
      q: params?.q,
      page: params?.page,
      size: params?.size,
      groupId: params?.groupId,
      courseId: params?.courseId,
      moduleId: params?.moduleId,
      batchId: params?.batchId,
      status: params?.status,
    });
    return this.request<StudentsListResponse>(`/students${queryString}`, {
      method: "GET",
    });
  }

  bulkPasteStudents(data: BulkPasteRequest) {
    return this.request<BulkPasteResponse>("/students/bulk-paste", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  exportStudentsCSV(params?: ExportCSVParams) {
    const queryString = buildQueryString({
      groupId: params?.groupId,
      batchId: params?.batchId,
      columns: params?.columns,
      studentIds: params?.studentIds,
    });
    return this.requestBlob(`/students/export/csv${queryString}`, {
      method: "GET",
    });
  }

  bulkDeleteStudents(payload: BulkDeleteStudentsPayload) {
    return this.request<BulkDeleteStudentsResponse>("/students/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getStudent(studentId: string) {
    return this.request<StudentDetail>(`/students/${studentId}`, {
      method: "GET",
    });
  }

  getStudentStats(studentId: string) {
    return this.request<import("@/types/students.types").StudentStats>(
      `/students/${studentId}/stats`,
      {
        method: "GET",
      }
    );
  }

  updateStudent(studentId: string, payload: UpdateStudentPayload) {
    return this.request<StudentDetail>(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  updateStudentNotes(studentId: string, notes: string) {
    return this.request<StudentDetail>(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  }

  deleteStudent(studentId: string) {
    return this.request<void>(`/students/${studentId}`, {
      method: "DELETE",
    });
  }

  // Roles methods
  listCustomRoles(workspaceId: string): Promise<CustomRolesResponse> {
    return this.request<CustomRolesResponse>(`/workspaces/${workspaceId}/roles`, {
      method: "GET",
    });
  }

  getCustomRole(workspaceId: string, roleId: string): Promise<CustomRole> {
    return this.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "GET",
    });
  }

  createCustomRole(workspaceId: string, payload: CreateRolePayload): Promise<CustomRole> {
    return this.request<CustomRole>(`/workspaces/${workspaceId}/roles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  updateCustomRole(
    workspaceId: string,
    roleId: string,
    payload: UpdateRolePayload
  ): Promise<CustomRole> {
    return this.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  deleteCustomRole(workspaceId: string, roleId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "DELETE",
    });
  }

  assignPermissionsToRole(
    workspaceId: string,
    roleId: string,
    payload: AssignPermissionsPayload
  ): Promise<CustomRole> {
    return this.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  listPermissions(): Promise<PermissionsResponse> {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      throw new Error("Workspace ID is required to list permissions.");
    }
    // Use the correct endpoint path - workspace ID is already added by request() method via X-Workspace-Id header
    return this.request<PermissionsResponse>("/workspaces/available-permissions", {
      method: "GET",
    });
  }

  createDefaultRoles(workspaceId: string): Promise<{
    message: string;
    admin: CustomRole;
    member: CustomRole;
    permissionsGranted: number;
  }> {
    return this.request(`/workspaces/${workspaceId}/roles/create-default`, {
      method: "POST",
    });
  }

  // AI Chat methods - Chat CRUD
  async getChats(): Promise<ChatListResponse> {
    return this.request("/ai-chat/chats", {
      method: "GET",
    });
  }

  async getChatById(chatId: string): Promise<Chat> {
    return this.request(`/ai-chat/chats/${chatId}`, {
      method: "GET",
    });
  }

  async createChat(title?: string): Promise<Chat> {
    return this.request("/ai-chat/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async updateChat(chatId: string, title: string): Promise<Chat> {
    return this.request(`/ai-chat/chats/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    return this.request(`/ai-chat/chats/${chatId}`, {
      method: "DELETE",
    });
  }

  // AI Chat methods - Messages
  sendChatMessage(message: string, chatId?: string): Promise<SendMessageResponse> {
    return this.request("/ai-chat/messages", {
      method: "POST",
      body: JSON.stringify({ message, chatId }),
    });
  }

  getChatHistory(chatId: string, limit?: number): Promise<ChatHistoryResponse> {
    const params = limit ? `?limit=${limit}` : "";
    return this.request(`/ai-chat/chats/${chatId}/messages${params}`, {
      method: "GET",
    });
  }

  clearChatHistory(chatId: string): Promise<void> {
    return this.request(`/ai-chat/chats/${chatId}/messages`, {
      method: "DELETE",
    });
  }

  async exportChatHistory(chatId: string, options?: ExportChatHistoryOptions): Promise<void> {
    const params = new URLSearchParams();
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options?.dateTo) params.append('dateTo', options.dateTo);
    if (options?.role) params.append('role', options.role);
    
    const queryString = params.toString();
    const endpoint = `/ai-chat/chats/${chatId}/export/history${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken || ''}`,
        'X-Workspace-Id': getWorkspaceId() || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      try {
        const error = await this.parseError(response);
        throw error;
      } catch (err) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'chat-history.csv'
      : 'chat-history.csv';

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportAIData(options: ExportAIDataOptions): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/ai-chat/export/data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken || ''}`,
        'X-Workspace-Id': getWorkspaceId() || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      try {
        const error = await this.parseError(response);
        throw error;
      } catch (err) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'ai-data.csv'
      : 'ai-data.csv';

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const apiClient = new ApiClient();
