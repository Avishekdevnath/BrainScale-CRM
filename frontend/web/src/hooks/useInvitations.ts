"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { Invitation, SendInvitationPayload } from "@/types/members.types";
import { toast } from "sonner";
import { mutate } from "swr";

/**
 * Hook to fetch workspace invitations
 */
export function useInvitations(workspaceId: string | null) {
  const { data, error, isLoading, mutate: swrMutate } = useSWR<Invitation[]>(
    workspaceId ? `workspace-invitations-${workspaceId}` : null,
    async () => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return apiClient.listInvitations(workspaceId);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    invitations: data || [],
    isLoading,
    error,
    mutate: swrMutate,
  };
}

/**
 * Hook to send invitation
 */
export function useSendInvitation(workspaceId: string) {
  return async (data: SendInvitationPayload) => {
    try {
      const result = await apiClient.sendInvitation(workspaceId, data);
      toast.success(result.message || "Invitation sent successfully");
      
      // Invalidate invitations list
      await mutate(`workspace-invitations-${workspaceId}`);
      
      return result;
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      const message = error?.message || "Failed to send invitation";
      
      // Handle specific error cases
      if (message.includes("already a member") || message.includes("already exists")) {
        toast.error("User is already a member or has a pending invitation");
      } else {
        toast.error(message);
      }
      
      throw error;
    }
  };
}

/**
 * Hook to cancel invitation
 */
export function useCancelInvitation(workspaceId: string) {
  return async (invitationId: string) => {
    try {
      await apiClient.cancelInvitation(workspaceId, invitationId);
      toast.success("Invitation cancelled successfully");
      
      // Invalidate invitations list
      await mutate(`workspace-invitations-${workspaceId}`);
    } catch (error: any) {
      console.error("Failed to cancel invitation:", error);
      toast.error(error?.message || "Failed to cancel invitation");
      throw error;
    }
  };
}

/**
 * Hook to resend invitation (reinvite)
 */
export function useResendInvitation(workspaceId: string) {
  return async (invitationId: string) => {
    try {
      const result = await apiClient.resendInvitation(workspaceId, invitationId);
      toast.success(result.message || "Invitation resent successfully");
      await mutate(`workspace-invitations-${workspaceId}`);
      return result;
    } catch (error: any) {
      console.error("Failed to resend invitation:", error);
      toast.error(error?.message || "Failed to resend invitation");
      throw error;
    }
  };
}

