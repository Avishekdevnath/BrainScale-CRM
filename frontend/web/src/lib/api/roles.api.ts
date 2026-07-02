import { http, getWorkspaceId } from "./http";
import type {
  CustomRole,
  CustomRolesResponse,
  CreateRolePayload,
  UpdateRolePayload,
  AssignPermissionsPayload,
  PermissionsResponse,
} from "@/types/roles.types";

export const rolesApi = {
  listCustomRoles(workspaceId: string): Promise<CustomRolesResponse> {
    return http.request<CustomRolesResponse>(`/workspaces/${workspaceId}/roles`, {
      method: "GET",
    });
  },

  getCustomRole(workspaceId: string, roleId: string): Promise<CustomRole> {
    return http.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "GET",
    });
  },

  createCustomRole(workspaceId: string, payload: CreateRolePayload): Promise<CustomRole> {
    return http.request<CustomRole>(`/workspaces/${workspaceId}/roles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateCustomRole(
    workspaceId: string,
    roleId: string,
    payload: UpdateRolePayload
  ): Promise<CustomRole> {
    return http.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteCustomRole(workspaceId: string, roleId: string): Promise<{ message: string }> {
    return http.request<{ message: string }>(`/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "DELETE",
    });
  },

  assignPermissionsToRole(
    workspaceId: string,
    roleId: string,
    payload: AssignPermissionsPayload
  ): Promise<CustomRole> {
    return http.request<CustomRole>(`/workspaces/${workspaceId}/roles/${roleId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  listPermissions(): Promise<PermissionsResponse> {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      throw new Error("Workspace ID is required to list permissions.");
    }
    // Use the correct endpoint path - workspace ID is already added by request() method via X-Workspace-Id header
    return http.request<PermissionsResponse>("/workspaces/available-permissions", {
      method: "GET",
    });
  },

  initializeDefaultPermissions(): Promise<{ message: string }> {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      throw new Error("Workspace ID is required to initialize permissions.");
    }
    return http.request<{ message: string }>("/workspaces/initialize-permissions", {
      method: "POST",
    });
  },

  createDefaultRoles(workspaceId: string): Promise<{
    message: string;
    admin: CustomRole;
    member: CustomRole;
    permissionsGranted: number;
  }> {
    return http.request(`/workspaces/${workspaceId}/roles/create-default`, {
      method: "POST",
    });
  },
};
