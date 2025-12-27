// Roles API Types

export interface CustomRole {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Array<{
    id: string;
    permission: {
      id: string;
      resource: string;
      action: string;
      description: string | null;
    };
  }>;
  _count?: {
    members: number;
  };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string | null;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
}

export interface AssignPermissionsPayload {
  permissionIds: string[];
}

export type CustomRolesResponse = CustomRole[];
export type PermissionsResponse = Permission[];

