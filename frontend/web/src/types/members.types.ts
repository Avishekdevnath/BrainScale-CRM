// Member Management & Invitations Types

export type MemberRole = "ADMIN" | "MEMBER";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";

// Workspace Member Interface
export interface WorkspaceMember {
  id: string; // WorkspaceMember ID
  userId: string; // User ID
  workspaceId: string;
  role: MemberRole;
  customRoleId: string | null;
  setupCompleted: boolean;
  agreementAccepted: boolean;
  agreementAcceptedAt: string | null; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  
  // Relations (included in API responses)
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  
  customRole?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  
  groupAccess?: Array<{
    id: string;
    groupId: string;
    group: {
      id: string;
      name: string;
    };
  }>;
}

// Invitation Interface
export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  role: MemberRole;
  customRoleId: string | null;
  status: InvitationStatus;
  invitedBy: string; // User ID
  expiresAt: string; // ISO 8601 datetime
  acceptedAt: string | null; // ISO 8601 datetime
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  
  // Relations (included in API responses)
  workspace?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  
  customRole?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  
  // Group IDs stored in meta field
  meta?: {
    groupIds?: string[];
  } | null;
}

// Request/Response Types

export type GetMembersResponse = WorkspaceMember[];

export interface InviteMemberPayload {
  email: string;
  role?: MemberRole;
  customRoleId?: string;
  groupIds?: string[];
}

export interface UpdateMemberPayload {
  role?: MemberRole;
  customRoleId?: string;
  // Note: Either role OR customRoleId must be provided, but not both (XOR)
}

export interface GrantGroupAccessPayload {
  groupIds: string[];
}

export interface CreateMemberWithAccountPayload {
  email: string;
  name?: string;
  phone?: string;
  role?: MemberRole;
  customRoleId?: string;
  groupIds?: string[];
  // Note: Either role OR customRoleId must be provided, but not both (XOR)
}

export interface SendInvitationPayload {
  email: string;
  role?: MemberRole;
  customRoleId?: string;
  groupIds?: string[];
}

export type ListInvitationsResponse = Invitation[];

export type GetInvitationByTokenResponse = Invitation;

