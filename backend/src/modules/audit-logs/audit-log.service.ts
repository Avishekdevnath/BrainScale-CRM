import { prisma } from '../../db/client';
import { CreateAuditLogOptions, ListAuditLogsOptions } from './audit-log.schemas';

export async function createAuditLog(options: CreateAuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: options.workspaceId,
        userId: options.userId,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        metadata: options.metadata as any,
      },
    });
  } catch (error) {
    // Silently fail - audit logging should not block primary operations
    console.error('Failed to create audit log:', error);
  }
}

export async function listAuditLogs(workspaceId: string, options: ListAuditLogsOptions) {
  const page = options.page || 1;
  const size = Math.min(options.size || 20, 100);
  const skip = (page - 1) * size;

  // Build where clause
  const where: Record<string, any> = {
    workspaceId,
  };

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.action) {
    where.action = {
      contains: options.action,
      mode: 'insensitive',
    };
  }

  if (options.entity) {
    where.entity = options.entity;
  }

  if (options.dateFrom) {
    where.createdAt = { gte: new Date(options.dateFrom) };
  }

  if (options.dateTo) {
    if (where.createdAt) {
      where.createdAt.lte = new Date(options.dateTo);
    } else {
      where.createdAt = { lte: new Date(options.dateTo) };
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
}
