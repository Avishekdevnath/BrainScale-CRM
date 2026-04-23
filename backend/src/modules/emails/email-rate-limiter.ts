import { prisma } from '../../db/client';
import { logger } from '../../config/logger';

/**
 * Token bucket rate limiter for email sending.
 * Prevents exceeding provider limits (e.g., 2 req/s for Resend).
 * Uses MongoDB for distributed rate limit tracking.
 */
export class EmailRateLimiter {
  private provider: string;
  private limit: number; // tokens per second

  private readonly WINDOW_MS = 1000;

  constructor(provider: string, limit: number) {
    this.provider = provider;
    this.limit = limit;
  }

  /**
   * Check if rate limit allows sending now
   */
  async checkRateLimit(): Promise<boolean> {
    try {
      const record = await this.getActiveWindow();

      if (!record) {
        // No current window exists, can send
        return true;
      }

      // Check if we have capacity
      return record.requestCount < this.limit;
    } catch (error) {
      logger.error({ error, provider: this.provider }, 'Rate limiter check error');
      // On error, fail open (allow send)
      return true;
    }
  }

  /**
   * Consume one token
   */
  async consumeToken(): Promise<void> {
    try {
      const active = await this.getActiveWindow();

      if (active) {
        await prisma.emailRateLimit.update({
          where: { id: active.id },
          data: { requestCount: { increment: 1 } },
        });
        return;
      }

      const now = new Date();
      await prisma.emailRateLimit.create({
        data: {
          provider: this.provider,
          windowStart: now,
          windowEnd: new Date(now.getTime() + this.WINDOW_MS),
          requestCount: 1,
        },
      });
    } catch (error) {
      logger.error({ error, provider: this.provider }, 'Rate limiter consume token error');
      // Don't throw, just log - sending should not fail if rate limiting fails
    }
  }

  /**
   * Wait until capacity available
   * Returns wait time in milliseconds
   */
  async waitForCapacity(): Promise<number> {
    const maxWait = 1100; // Max 1.1 seconds
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    while (elapsed < maxWait) {
      if (await this.checkRateLimit()) {
        return elapsed;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    return maxWait;
  }

  /**
   * Reset limit (for testing)
   */
  async reset(): Promise<void> {
    try {
      await prisma.emailRateLimit.deleteMany({
        where: { provider: this.provider },
      });
      logger.info({ provider: this.provider }, 'Rate limiter reset');
    } catch (error) {
      logger.error({ error, provider: this.provider }, 'Rate limiter reset error');
    }
  }

  /**
   * Get current rate limit status
   */
  async getStatus(): Promise<{
    provider: string;
    limit: number;
    current: number;
    capacity: number;
  }> {
    try {
      const record = await this.getActiveWindow();

      const current = record?.requestCount ?? 0;
      const capacity = this.limit - current;

      return {
        provider: this.provider,
        limit: this.limit,
        current,
        capacity,
      };
    } catch (error) {
      logger.error({ error, provider: this.provider }, 'Rate limiter status error');
      return {
        provider: this.provider,
        limit: this.limit,
        current: 0,
        capacity: this.limit,
      };
    }
  }

  private async getActiveWindow() {
    const now = new Date();

    return prisma.emailRateLimit.findFirst({
      where: {
        provider: this.provider,
        windowStart: { lte: now },
        windowEnd: { gt: now },
      },
      orderBy: { windowEnd: 'desc' },
    });
  }
}

/**
 * Factory function to create rate limiter
 */
export function createRateLimiter(provider: string, limit: number): EmailRateLimiter {
  return new EmailRateLimiter(provider, limit);
}

/**
 * Resend rate limiter (2 req/s by default)
 */
export const resendRateLimiter = createRateLimiter(
  'resend',
  parseInt(process.env.EMAIL_RESEND_RATE_LIMIT || '2', 10)
);

/**
 * SMTP rate limiter (10 req/s by default)
 */
export const smtpRateLimiter = createRateLimiter(
  'smtp',
  parseInt(process.env.EMAIL_SMTP_RATE_LIMIT || '10', 10)
);
