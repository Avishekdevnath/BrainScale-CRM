import { emailQueueService } from './email-queue.service';
import { resendRateLimiter } from './email-rate-limiter';
import { sendEmailWithResend } from '../../utils/email-resend';
import { logger } from '../../config/logger';

// Vercel constraints
const VERCEL_TIMEOUT_MS = 10000; // Hard limit
const SAFETY_MARGIN_MS = 2000; // Exit 2 seconds early
const PROCESSING_TIMEOUT_MS = VERCEL_TIMEOUT_MS - SAFETY_MARGIN_MS; // 8 seconds
const PER_EMAIL_ESTIMATE_MS = 1500; // Generous estimate per email

/**
 * Batch processing result
 */
export interface BatchResult {
  sent: number;
  failed: number;
  retried: number;
  processed: number;
  timedOut?: boolean;
  reason?: string;
}

/**
 * Process email batch with timeout safety
 * - Respects Vercel 10-second timeout
 * - Exits early (8 seconds) to avoid being killed
 * - Respects 2 req/s rate limit
 * - Handles retryable errors gracefully
 */
export async function processEmailBatch(): Promise<BatchResult> {
  const startTime = Date.now();
  const results: BatchResult = {
    sent: 0,
    failed: 0,
    retried: 0,
    processed: 0,
  };

  try {
    logger.info('Starting email batch processing');

    while (Date.now() - startTime < PROCESSING_TIMEOUT_MS) {
      const elapsed = Date.now() - startTime;
      const remaining = PROCESSING_TIMEOUT_MS - elapsed;

      // Can we fit another email? (safety check)
      if (remaining < PER_EMAIL_ESTIMATE_MS) {
        logger.info(
          { remaining, elapsed, processed: results.processed },
          'Approaching timeout, exiting batch'
        );
        results.timedOut = true;
        break;
      }

      // Get next email
      const emails = await emailQueueService.getPendingEmails(1);
      if (emails.length === 0) {
        logger.debug('No pending emails to process');
        break;
      }

      const email = emails[0];

      try {
        // Mark as processing
        await emailQueueService.markAsProcessing(email.id);

        // Check rate limit (don't wait - just skip and reschedule)
        const canSend = await resendRateLimiter.checkRateLimit();
        if (!canSend) {
          // Rate limited - reschedule for next batch
          await emailQueueService.scheduleRetry(email.id);
          results.retried++;
          logger.debug(
            { emailId: email.id, to: email.to },
            'Rate limited, rescheduling'
          );
          break; // Exit to avoid timeout waiting
        }

        // Send email
        const sendStartTime = Date.now();
        const result = await sendEmailWithResend({
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text || undefined,
        });
        const sendDuration = Date.now() - sendStartTime;

        // Mark as sent
        await emailQueueService.markAsSent(email.id, result.id ?? '');

        // Consume token
        await resendRateLimiter.consumeToken();

        results.sent++;
        results.processed++;

        logger.debug(
          {
            emailId: email.id,
            to: email.to,
            duration: sendDuration,
          },
          'Email sent'
        );
      } catch (error: any) {
        // Classify error
        const isRetryable = isRetryableError(error);

        try {
          await emailQueueService.markAsFailed(
            email.id,
            error.message,
            isRetryable
          );
        } catch (markError) {
          logger.error({ error: markError, emailId: email.id }, 'Failed to mark email as failed');
        }

        if (isRetryable) {
          results.retried++;
        } else {
          results.failed++;
        }
        results.processed++;

        logger.warn(
          {
            emailId: email.id,
            to: email.to,
            error: error.message,
            retryable: isRetryable,
          },
          'Failed to send email'
        );
      }
    }

    logger.info(results, 'Email batch processing completed');
    return results;
  } catch (error) {
    logger.error({ error }, 'Unhandled error in email worker');
    results.reason = String(error);
    throw error;
  }
}

/**
 * Classify error to determine if retry is appropriate
 */
function isRetryableError(error: any): boolean {
  // Resend API errors
  if (error.code === 'RATE_LIMIT_EXCEEDED') return true;
  if (error.status === 429) return true;
  if (error.status >= 500) return true;

  // Network errors
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNECTION') return true;
  if (error.code === 'ESOCKET') return true;
  if (error.code === 'ENOTFOUND') return true;
  if (error.code === 'ECONNREFUSED') return true;

  // Other transient errors
  if (error.code === 'EHOSTUNREACH') return true;
  if (error.code === 'ENETUNREACH') return true;

  // Non-retryable: 4xx client errors
  return false;
}

/**
 * Get worker status
 */
export async function getWorkerStatus(): Promise<{
  lastRun?: Date;
  isRunning: boolean;
  pendingCount: number;
}> {
  try {
    const status = await emailQueueService.getQueueStatus();
    return {
      isRunning: status.processing > 0,
      pendingCount: status.pending + status.processing,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get worker status');
    return {
      isRunning: false,
      pendingCount: 0,
    };
  }
}
