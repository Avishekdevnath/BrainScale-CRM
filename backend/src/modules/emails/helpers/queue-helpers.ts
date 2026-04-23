import { emailQueueService } from '../email-queue.service';

/**
 * Queue transactional email (high priority, immediate delivery expected)
 * Used for: OTP codes, password resets, invitations, authentication
 *
 * Returns: Queue ID (email is queued, not necessarily sent yet)
 */
export async function queueTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  options?: {
    workspaceId?: string;
    userId?: string;
    metadata?: any;
  }
): Promise<string> {
  return emailQueueService.queueEmail({
    to,
    subject,
    html,
    type: 'TRANSACTIONAL',
    priority: 1, // Highest priority
    workspaceId: options?.workspaceId || 'system',
    userId: options?.userId,
    metadata: options?.metadata,
  });
}

/**
 * Queue bulk email (normal priority, can wait)
 * Used for: Daily digests, weekly summaries, batch notifications
 *
 * Returns: Array of queue IDs
 */
export async function queueBulkEmail(
  workspaceId: string,
  emails: Array<{ to: string; html: string }>,
  subject: string,
  metadata?: any
): Promise<string[]> {
  const queueIds: string[] = [];

  for (const email of emails) {
    const queueId = await emailQueueService.queueEmail({
      to: email.to,
      subject,
      html: email.html,
      type: 'BULK',
      priority: 10, // Normal priority
      workspaceId,
      metadata,
    });
    queueIds.push(queueId);
  }

  return queueIds;
}

/**
 * Queue reminder email (high priority, scheduled)
 * Used for: Follow-up reminders, task reminders, notification reminders
 *
 * Returns: Queue ID
 */
export async function queueReminderEmail(
  workspaceId: string,
  userId: string,
  to: string,
  subject: string,
  html: string,
  metadata?: any
): Promise<string> {
  return emailQueueService.queueEmail({
    to,
    subject,
    html,
    type: 'REMINDER',
    priority: 5, // High priority
    workspaceId,
    userId,
    metadata,
  });
}

/**
 * Check if email was successfully sent
 * Polls the queue until email status changes or timeout
 */
export async function waitForEmailSent(
  queueId: string,
  timeout: number = 30000
): Promise<boolean> {
  const pollInterval = 500; // Check every 500ms
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const email = await emailQueueService.getEmail(queueId);

    if (!email) {
      return false; // Email not found
    }

    if (email.status === 'SENT') {
      return true; // Successfully sent
    }

    if (email.status === 'FAILED' || email.status === 'CANCELLED') {
      return false; // Permanent failure
    }

    // Still pending or processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return false; // Timeout
}
