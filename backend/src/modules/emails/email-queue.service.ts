import { prisma } from '../../db/client';
import { logger } from '../../config/logger';
import type { EmailQueue } from '@prisma/client';

/**
 * Email queue input for adding emails to the queue
 */
export interface EmailQueueInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: 'TRANSACTIONAL' | 'BULK' | 'REMINDER';
  priority?: number;
  workspaceId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Email queue service
 * Manages email queue with priority, retry, and status tracking
 */
export class EmailQueueService {
  /**
   * Add email to queue
   * Returns queue ID
   */
  async queueEmail(input: EmailQueueInput): Promise<string> {
    const priority = input.priority ?? this.getDefaultPriority(input.type);
    const maxRetries = this.getMaxRetries(input.type);

    try {
      const email = await prisma.emailQueue.create({
        data: {
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          type: input.type || 'TRANSACTIONAL',
          priority,
          workspaceId: input.workspaceId,
          userId: input.userId,
          metadata: input.metadata,
          maxRetries,
        },
      });

      logger.info(
        { queueId: email.id, to: email.to, type: email.type, priority: email.priority },
        'Email queued'
      );
      return email.id;
    } catch (error) {
      logger.error({ error, to: input.to }, 'Failed to queue email');
      throw error;
    }
  }

  /**
   * Get queue status (stats)
   */
  async getQueueStatus(workspaceId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
    sent: number;
    avgWaitTime: number;
  }> {
    const where = workspaceId ? { workspaceId } : {};

    try {
      const [total, pending, processing, failed, sent] = await Promise.all([
        prisma.emailQueue.count({ where }),
        prisma.emailQueue.count({ where: { ...where, status: 'PENDING' } }),
        prisma.emailQueue.count({ where: { ...where, status: 'PROCESSING' } }),
        prisma.emailQueue.count({ where: { ...where, status: 'FAILED' } }),
        prisma.emailQueue.count({ where: { ...where, status: 'SENT' } }),
      ]);

      return { total, pending, processing, failed, sent, avgWaitTime: 0 };
    } catch (error) {
      logger.error({ error }, 'Failed to get queue status');
      return { total: 0, pending: 0, processing: 0, failed: 0, sent: 0, avgWaitTime: 0 };
    }
  }

  /**
   * Get pending emails to process
   * Ordered by priority (ascending) then creation date
   */
  async getPendingEmails(limit: number, workspaceId?: string): Promise<EmailQueue[]> {
    try {
      return await prisma.emailQueue.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          status: { in: ['PENDING', 'RETRYING'] },
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: new Date() } },
          ],
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: limit,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get pending emails');
      return [];
    }
  }

  /**
   * Mark email as processing
   */
  async markAsProcessing(queueId: string): Promise<void> {
    try {
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: { status: 'PROCESSING' },
      });
    } catch (error) {
      logger.error({ error, queueId }, 'Failed to mark email as processing');
      throw error;
    }
  }

  /**
   * Mark email as sent
   */
  async markAsSent(queueId: string, messageId: string): Promise<void> {
    try {
      const email = await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: 'SENT',
          messageId,
          sentAt: new Date(),
        },
      });

      // Log delivery
      try {
        await prisma.emailLog.create({
          data: {
            queueId,
            workspaceId: email.workspaceId,
            userId: email.userId,
            to: email.to,
            type: email.type,
            subject: email.subject,
            status: 'SENT',
            messageId,
          },
        });
      } catch (logError) {
        logger.warn({ error: logError }, 'Failed to create email log');
        // Don't throw, email was sent successfully even if logging fails
      }

      logger.info({ queueId, messageId, to: email.to }, 'Email sent successfully');
    } catch (error) {
      logger.error({ error, queueId }, 'Failed to mark email as sent');
      throw error;
    }
  }

  /**
   * Mark email as failed
   */
  async markAsFailed(
    queueId: string,
    error: string,
    retryable: boolean
  ): Promise<void> {
    try {
      const email = await prisma.emailQueue.findUnique({
        where: { id: queueId },
      });

      if (!email) {
        logger.warn({ queueId }, 'Email not found for marking as failed');
        return;
      }

      if (retryable && email.retryCount < email.maxRetries) {
        await this.scheduleRetry(queueId);
      } else {
        await prisma.emailQueue.update({
          where: { id: queueId },
          data: { status: 'FAILED', error },
        });

        try {
          await prisma.emailLog.create({
            data: {
              queueId,
              workspaceId: email.workspaceId,
              userId: email.userId,
              to: email.to,
              type: email.type,
              subject: email.subject,
              status: 'FAILED',
              errorMessage: error,
            },
          });
        } catch (logError) {
          logger.warn({ error: logError }, 'Failed to create email log');
        }

        logger.error(
          { queueId, error, retryable },
          'Email failed (no more retries)'
        );
      }
    } catch (err) {
      logger.error({ error: err, queueId }, 'Failed to mark email as failed');
      throw err;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  async scheduleRetry(queueId: string): Promise<void> {
    try {
      const email = await prisma.emailQueue.findUnique({
        where: { id: queueId },
      });

      if (!email) {
        logger.warn({ queueId }, 'Email not found for scheduling retry');
        return;
      }

      const nextRetryDelay = this.calculateRetryDelay(email.retryCount);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: 'RETRYING',
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          nextRetryAt,
          error: null,
        },
      });

      logger.info(
        { queueId, retryCount: email.retryCount + 1, nextRetryAt },
        'Email scheduled for retry'
      );
    } catch (error) {
      logger.error({ error, queueId }, 'Failed to schedule retry');
      throw error;
    }
  }

  /**
   * Cancel queued email
   */
  async cancelEmail(queueId: string): Promise<void> {
    try {
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: { status: 'CANCELLED' },
      });

      logger.info({ queueId }, 'Email cancelled');
    } catch (error) {
      logger.error({ error, queueId }, 'Failed to cancel email');
      throw error;
    }
  }

  /**
   * Get email details
   */
  async getEmail(queueId: string): Promise<EmailQueue | null> {
    try {
      return await prisma.emailQueue.findUnique({
        where: { id: queueId },
      });
    } catch (error) {
      logger.error({ error, queueId }, 'Failed to get email');
      return null;
    }
  }

  /**
   * Get default priority by type
   */
  private getDefaultPriority(type?: string): number {
    const priorityMap: Record<string, number> = {
      TRANSACTIONAL: 1,
      REMINDER: 5,
      BULK: 10,
    };
    return priorityMap[type || 'TRANSACTIONAL'] ?? 10;
  }

  /**
   * Get max retries by type
   */
  private getMaxRetries(type?: string): number {
    const retriesMap: Record<string, number> = {
      TRANSACTIONAL: 3,
      REMINDER: 2,
      BULK: 3,
    };
    return retriesMap[type || 'TRANSACTIONAL'] ?? 3;
  }

  /**
   * Calculate retry delay with exponential backoff
   * Attempt 1: 5 minutes
   * Attempt 2: 30 minutes
   * Attempt 3: 180 minutes (3 hours)
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 5 * 60 * 1000; // 5 minutes
    const multiplier = 6; // Next delay: 30 minutes

    if (retryCount === 0) return baseDelay; // 5 min after 1st attempt
    if (retryCount === 1) return baseDelay * multiplier; // 30 min after 2nd attempt
    return baseDelay * multiplier * multiplier; // 180 min after 3rd attempt
  }
}

/**
 * Singleton instance
 */
export const emailQueueService = new EmailQueueService();
