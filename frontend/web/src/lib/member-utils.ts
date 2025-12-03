import type { WorkspaceMember, Invitation, MemberRole, InvitationStatus } from "@/types/members.types";

/**
 * Get human-readable label for role
 */
export function getRoleLabel(role: MemberRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Member";
    default:
      return role;
  }
}

/**
 * Get color for role badge
 */
export function getRoleColor(role: MemberRole | string): string {
  switch (role) {
    case "ADMIN":
      return "var(--groups1-primary)";
    case "MEMBER":
      return "var(--groups1-text-secondary)";
    default:
      return "var(--groups1-text-secondary)";
  }
}

/**
 * Get human-readable label for invitation status
 */
export function getStatusLabel(status: InvitationStatus | string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

/**
 * Get color for status badge
 */
export function getStatusColor(status: InvitationStatus | string): string {
  switch (status) {
    case "PENDING":
      return "var(--groups1-primary)"; // Blue
    case "ACCEPTED":
      return "#10b981"; // Green
    case "CANCELLED":
      return "var(--groups1-text-secondary)"; // Gray
    case "EXPIRED":
      return "#ef4444"; // Red
    default:
      return "var(--groups1-text-secondary)";
  }
}

/**
 * Format member name for display
 */
export function formatMemberName(member: WorkspaceMember): string {
  return member.user.name || member.user.email || "Unknown";
}

/**
 * Check if invitation is expired
 */
export function isExpiredInvitation(invitation: Invitation): boolean {
  if (invitation.status === "EXPIRED") return true;
  if (invitation.status !== "PENDING") return false;
  
  const expiresAt = new Date(invitation.expiresAt);
  const now = new Date();
  return expiresAt < now;
}

/**
 * Get days until invitation expires (negative if expired)
 */
export function getInvitationExpiryDays(invitation: Invitation): number {
  const expiresAt = new Date(invitation.expiresAt);
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format invitation expiry for display
 */
export function formatInvitationExpiry(invitation: Invitation): string {
  if (invitation.status === "EXPIRED" || isExpiredInvitation(invitation)) {
    const days = Math.abs(getInvitationExpiryDays(invitation));
    return `Expired ${days} day${days !== 1 ? "s" : ""} ago`;
  }
  
  if (invitation.status !== "PENDING") {
    return getStatusLabel(invitation.status);
  }
  
  const days = getInvitationExpiryDays(invitation);
  if (days < 0) {
    return "Expired";
  } else if (days === 0) {
    return "Expires today";
  } else if (days === 1) {
    return "Expires tomorrow";
  } else {
    return `Expires in ${days} days`;
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

