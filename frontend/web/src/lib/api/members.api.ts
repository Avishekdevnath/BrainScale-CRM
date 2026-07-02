import { http, API_BASE_URL } from "./http";
import type {
  WorkspaceMember,
  GetMembersResponse,
  InviteMemberPayload,
  InviteMemberResponse,
  UpdateMemberPayload,
  GrantGroupAccessPayload,
  CreateMemberWithAccountPayload,
  SendInvitationPayload,
  ListInvitationsResponse,
  GetInvitationByTokenResponse,
} from "@/types/members.types";

export const membersApi = {
  getWorkspaceMembers(workspaceId: string) {
    return http.request<GetMembersResponse>(`/workspaces/${workspaceId}/members`, {
      method: "GET",
    });
  },

  inviteMember(workspaceId: string, data: InviteMemberPayload) {
    return http.request<InviteMemberResponse>(`/workspaces/${workspaceId}/members/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createMemberWithAccount(workspaceId: string, data: CreateMemberWithAccountPayload) {
    return http.request<{
      member: WorkspaceMember;
      message: string;
      temporaryPassword: string;
    }>(`/workspaces/${workspaceId}/members/create`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  reinviteMemberWithAccount(workspaceId: string, memberId: string) {
    return http.request<{
      message: string;
      temporaryPassword: string;
    }>(`/workspaces/${workspaceId}/members/${memberId}/reinvite`, {
      method: "POST",
    });
  },

  updateMember(workspaceId: string, memberId: string, data: UpdateMemberPayload) {
    return http.request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  updateMemberUser(workspaceId: string, memberId: string, data: { name?: string; email?: string }) {
    return http.request<{ id: string; name: string | null; email: string }>(
      `/workspaces/${workspaceId}/members/${memberId}/user`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  grantGroupAccess(workspaceId: string, memberId: string, data: GrantGroupAccessPayload) {
    return http.request<WorkspaceMember>(
      `/workspaces/${workspaceId}/members/${memberId}/groups`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  removeMember(workspaceId: string, memberId: string) {
    return http.request<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
  },

  deleteMemberAccount(workspaceId: string, memberId: string) {
    return http.request<{ message: string }>(
      `/workspaces/${workspaceId}/members/${memberId}/account`,
      {
        method: "DELETE",
      }
    );
  },

  // Invitation methods
  sendInvitation(workspaceId: string, data: SendInvitationPayload) {
    return http.request<{
      id: string;
      email: string;
      role: string;
      customRole: { id: string; name: string; description: string | null } | null;
      expiresAt: string;
      status: string;
      temporaryPassword: string | null;
      emailSent: boolean;
      message: string;
    }>(`/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listInvitations(workspaceId: string) {
    return http.request<ListInvitationsResponse>(`/workspaces/${workspaceId}/invitations`, {
      method: "GET",
    });
  },

  cancelInvitation(workspaceId: string, invitationId: string) {
    return http.request<{ message: string }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`,
      {
        method: "DELETE",
      }
    );
  },

  resendInvitation(workspaceId: string, invitationId: string) {
    return http.request<{
      id: string;
      email: string;
      expiresAt: string;
      status: string;
      message: string;
    }>(`/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {
      method: "POST",
    });
  },

  getInvitationByToken(token: string) {
    // Public endpoint - no workspace header needed
    // Override the request method to exclude workspace header
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (http.accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${http.accessToken}`;
    }

    return fetch(`${API_BASE_URL}/invitations/${token}`, {
      method: "GET",
      headers,
    }).then(async (res) => {
      if (!res.ok) throw await http.parseError(res);
      return res.json() as Promise<GetInvitationByTokenResponse>;
    });
  },
};
