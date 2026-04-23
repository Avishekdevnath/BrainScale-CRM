import { prisma } from '../../db/client';
import { logger } from '../../config/logger';

const LOCK_NAME = 'email-queue-worker';
const LOCK_DURATION_MS = 8000; // 8 seconds (< Vercel 10s timeout)

/**
 * Distributed lock for email worker
 * Prevents duplicate processing when multiple Vercel cron instances run concurrently
 * Uses MongoDB atomic operations for safety
 */
export class WorkerLock {
  private workerId: string;

  constructor() {
    this.workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Try to acquire lock (atomic operation)
   * Returns true if lock was acquired
   */
  async acquire(): Promise<boolean> {
    try {
      // Clean expired locks first
      await prisma.processingLock.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      // Try to create/update lock atomically
      await prisma.processingLock.upsert({
        where: { name: LOCK_NAME },
        create: {
          name: LOCK_NAME,
          lockedBy: this.workerId,
          expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
        },
        update: {
          lockedBy: this.workerId,
          expiresAt: new Date(Date.now() + LOCK_DURATION_MS),
        },
      });

      // Verify WE got the lock (not another worker)
      const lock = await prisma.processingLock.findUnique({
        where: { name: LOCK_NAME },
      });

      const acquired = lock?.lockedBy === this.workerId;
      if (acquired) {
        logger.info({ workerId: this.workerId }, 'Acquired email worker lock');
      } else {
        logger.debug(
          { ourWorkerId: this.workerId, lockOwnerId: lock?.lockedBy },
          'Could not acquire lock'
        );
      }
      return acquired;
    } catch (error) {
      logger.error({ error }, 'Failed to acquire lock');
      return false;
    }
  }

  /**
   * Release lock
   */
  async release(): Promise<void> {
    try {
      const deleted = await prisma.processingLock.deleteMany({
        where: { name: LOCK_NAME, lockedBy: this.workerId },
      });

      if (deleted.count > 0) {
        logger.info({ workerId: this.workerId }, 'Released email worker lock');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to release lock');
    }
  }

  /**
   * Get lock owner (for debugging)
   */
  async getOwner(): Promise<string | null> {
    try {
      const lock = await prisma.processingLock.findUnique({
        where: { name: LOCK_NAME },
      });
      return lock?.lockedBy ?? null;
    } catch (error) {
      logger.error({ error }, 'Failed to get lock owner');
      return null;
    }
  }

  /**
   * Get lock status
   */
  async getStatus(): Promise<{
    isLocked: boolean;
    lockedBy?: string;
    expiresAt?: Date;
  }> {
    try {
      const lock = await prisma.processingLock.findUnique({
        where: { name: LOCK_NAME },
      });

      if (!lock) {
        return { isLocked: false };
      }

      if (lock.expiresAt < new Date()) {
        return { isLocked: false }; // Expired
      }

      return {
        isLocked: true,
        lockedBy: lock.lockedBy,
        expiresAt: lock.expiresAt,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get lock status');
      return { isLocked: false };
    }
  }
}

/**
 * Create lock instance
 */
export function createWorkerLock(): WorkerLock {
  return new WorkerLock();
}
