import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailOptions } from './email';

// Initialize Resend client if API key is present
let resend: Resend | null = null;
if (env.RESEND_API_KEY) {
  resend = new Resend(env.RESEND_API_KEY);
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Send email via Resend with retry logic
 */
export const sendEmailWithResend = async (
  options: EmailOptions,
  retryCount = 0
): Promise<void> => {
  if (!env.RESEND_API_KEY || !resend) {
    const error = new Error('RESEND_API_KEY is missing. Please set it in environment variables.');
    logger.error({ error: error.message }, 'Cannot send email: Resend not configured');
    throw error;
  }

  try {
    // Format sender name
    const fromName = env.EMAIL_FROM_NAME || 'BrainScale CRM';
    const hasSpecialChars = /[<>,;:\[\]\\"]/.test(fromName);
    const formattedFrom = hasSpecialChars
      ? `"${fromName.replace(/"/g, '\\"')}" <${env.EMAIL_FROM}>`
      : `${fromName} <${env.EMAIL_FROM}>`;

    const response = await resend.emails.send({
      from: formattedFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      replyTo: env.EMAIL_REPLY_TO,
    });

    // Check for errors in response
    if (response.error) {
      const error = new Error(`Resend API error: ${response.error.message}`);
      logger.error({
        error: response.error,
        to: options.to,
        subject: options.subject,
      }, 'Resend email send failed');
      throw error;
    }

    // Verify email was sent (has id)
    if (!response.data?.id) {
      const error = new Error('Resend did not return a message ID. Email may not have been sent.');
      logger.error({
        response: response.data,
        to: options.to,
        subject: options.subject,
      }, 'Resend email missing message ID');
      throw error;
    }

    logger.info(
      {
        messageId: response.data.id,
        to: options.to,
        subject: options.subject,
        retryAttempt: retryCount,
      },
      'Email sent via Resend'
    );
  } catch (error: any) {
    const errorDetails: any = {
      to: options.to,
      subject: options.subject,
      error: error?.message,
      retryAttempt: retryCount,
      isVercel: process.env.VERCEL === '1',
      nodeEnv: process.env.NODE_ENV,
    };

    // Retry on transient errors
    const isRetryable =
      error?.message?.includes('rate') ||
      error?.message?.includes('timeout') ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ECONNECTION';

    if (isRetryable && retryCount < MAX_RETRIES) {
      logger.warn(
        { ...errorDetails, nextRetryInMs: RETRY_DELAY_MS },
        'Resend send failed, will retry'
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1)));
      return sendEmailWithResend(options, retryCount + 1);
    }

    logger.error(errorDetails, 'Failed to send email via Resend');

    // Provide specific error messages for common issues
    if (error?.message?.includes('invalid_api_key')) {
      throw new Error('Resend API key is invalid. Check RESEND_API_KEY in your environment variables.');
    }
    if (error?.message?.includes('invalid_from_address')) {
      throw new Error(`Resend from address error: ${error.message}. Verify sender email (${env.EMAIL_FROM}).`);
    }
    if (error?.message?.includes('rate')) {
      throw new Error('Resend rate limit exceeded. Please try again later.');
    }

    throw error;
  }
};
