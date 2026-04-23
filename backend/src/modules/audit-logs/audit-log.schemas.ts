import { z } from 'zod';

export const ListAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(),
});

export type ListAuditLogsOptions = z.infer<typeof ListAuditLogsSchema>;

export interface CreateAuditLogOptions {
  workspaceId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
