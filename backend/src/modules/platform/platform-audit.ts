type AuditClient = { platformAuditLog: { create: (args: any) => Promise<any> } };

export interface PlatformAuditEntry {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: unknown;
}

/**
 * Write a platform-level audit row. Accepts a Prisma client or a transaction
 * client (anything exposing `platformAuditLog.create`).
 */
export const writePlatformAudit = async (
  client: AuditClient,
  entry: PlatformAuditEntry,
): Promise<void> => {
  await client.platformAuditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata as any,
    },
  });
};
