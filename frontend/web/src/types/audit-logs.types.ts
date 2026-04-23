export interface AuditLog {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface GetAuditLogsParams {
  page?: number;
  size?: number;
  userId?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
}
