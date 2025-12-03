"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type {
  WorkspaceMember,
  InviteMemberPayload,
  UpdateMemberPayload,
  GrantGroupAccessPayload,
  CreateMemberWithAccountPayload,
} from "@/types/members.types";
import { toast } from "sonner";
import { mutate } from "swr";

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string | null) {
  const { data, error, isLoading, mutate: swrMutate } = useSWR<WorkspaceMember[]>(
    workspaceId ? `workspace-members-${workspaceId}` : null,
    async () => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return apiClient.getWorkspaceMembers(workspaceId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    members: data || [],
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Hook to update member role
 */
export function useUpdateMember(workspaceId: string) {
  return async (memberId: string, data: UpdateMemberPayload) => {
    try {
      const updated = await apiClient.updateMember(workspaceId, memberId, data);
      toast.success("Member role updated successfully");
      
      // Invalidate members list
      await mutate(`workspace-members-${workspaceId}`);
      
      return updated;
    } catch (error: any) {
      console.error("Failed to update member:", error);
      toast.error(error?.message || "Failed to update member role");
      throw error;
    }
  };
}

/**
 * Hook to remove member
 */
export function useRemoveMember(workspaceId: string) {
  return async (memberId: string) => {
    try {
      await apiClient.removeMember(workspaceId, memberId);
      toast.success("Member removed successfully");
      
      // Invalidate members list
      await mutate(`workspace-members-${workspaceId}`);
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      toast.error(error?.message || "Failed to remove member");
      throw error;
    }
  };
}

/**
 * Hook to grant group access
 */
export function useGrantGroupAccess(workspaceId: string) {
  return async (memberId: string, data: GrantGroupAccessPayload) => {
    try {
      const updated = await apiClient.grantGroupAccess(workspaceId, memberId, data);
      toast.success("Group access updated successfully");
      
      // Invalidate members list
      await mutate(`workspace-members-${workspaceId}`);
      
      return updated;
    } catch (error: any) {
      console.error("Failed to grant group access:", error);
      toast.error(error?.message || "Failed to update group access");
      throw error;
    }
  };
}

/**
 * Hook to invite member
 */
export function useInviteMember(workspaceId: string) {
  return async (data: InviteMemberPayload) => {
    try {
      const result = await apiClient.inviteMember(workspaceId, data);
      toast.success("Invitation sent successfully");
      
      // Invalidate members and invitations lists
      await mutate(`workspace-members-${workspaceId}`);
      await mutate(`workspace-invitations-${workspaceId}`);
      
      return result;
    } catch (error: any) {
      console.error("Failed to invite member:", error);
      const message = error?.message || "Failed to send invitation";
      
      // Handle specific error cases
      if (message.includes("already a member") || message.includes("already exists")) {
        toast.error("User is already a member of this workspace");
      } else {
        toast.error(message);
      }
      
      throw error;
    }
  };
}

/**
 * Hook to create member with account
 */
export function useCreateMemberWithAccount(workspaceId: string) {
  return async (data: CreateMemberWithAccountPayload) => {
    try {
      const result = await apiClient.createMemberWithAccount(workspaceId, data);
      toast.success(result.message || "Member account created successfully");
      
      // Invalidate members list
      await mutate(`workspace-members-${workspaceId}`);
      
      return result;
    } catch (error: any) {
      console.error("Failed to create member:", error);
      const message = error?.message || "Failed to create member account";
      
      if (message.includes("already exists")) {
        toast.error("User with this email already exists");
      } else {
        toast.error(message);
      }
      
      throw error;
    }
  };
}

