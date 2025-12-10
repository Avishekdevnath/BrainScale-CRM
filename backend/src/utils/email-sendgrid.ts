import sgMail from '@sendgrid/mail';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailOptions } from './email';

// Initialize SendGrid client if API key is present
if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  // Uncomment for EU data residency if your subuser is EU pinned
  // sgMail.setDataResidency('eu');
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Send email via SendGrid with basic retry and structured logging.
 */
export const sendEmailWithSendGrid = async (
  options: EmailOptions,
  retryCount = 0
): Promise<void> => {
  if (!env.SENDGRID_API_KEY) {
    const error = new Error('SENDGRID_API_KEY is missing. Please set it in environment variables.');
    logger.error({ error: error.message }, 'Cannot send email: SendGrid not configured');
    throw error;
  }

  try {
    const msg = {
      to: options.to,
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      replyTo: env.EMAIL_REPLY_TO,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    };

    const [response] = await sgMail.send(msg);

    // Explicitly verify email was accepted by SendGrid
    // SendGrid returns 202 (Accepted) when email is queued for delivery
    if (response.statusCode !== 202) {
      const error = new Error(`SendGrid returned status ${response.statusCode} instead of 202 (accepted). Email was not accepted.`);
      logger.error({
        statusCode: response.statusCode,
        headers: response.headers,
        to: options.to,
        subject: options.subject,
      }, 'SendGrid email not accepted');
      throw error;
    }

    // Verify message ID exists (confirms email was queued)
    const messageId = response.headers['x-message-id'];
    if (!messageId) {
      const error = new Error('SendGrid did not return a message ID. Email may not have been queued.');
      logger.error({
        statusCode: response.statusCode,
        headers: response.headers,
        to: options.to,
        subject: options.subject,
      }, 'SendGrid email missing message ID');
      throw error;
    }

    logger.info(
      {
        statusCode: response.statusCode,
        messageId,
        to: options.to,
        subject: options.subject,
        retryAttempt: retryCount,
      },
      'Email sent via SendGrid'
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

    if (error?.response) {
      errorDetails.statusCode = error.response.statusCode;
      errorDetails.body = error.response.body;
      errorDetails.headers = error.response.headers;
    }

    // Retry on transient errors
    const isRetryable =
      error?.response?.statusCode === 429 || // rate limit
      error?.response?.statusCode >= 500 || // server errors
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ECONNECTION';

    if (isRetryable && retryCount < MAX_RETRIES) {
      logger.warn(
        { ...errorDetails, nextRetryInMs: RETRY_DELAY_MS },
        'SendGrid send failed, will retry'
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1)));
      return sendEmailWithSendGrid(options, retryCount + 1);
    }

    logger.error(errorDetails, 'Failed to send email via SendGrid');

    // Provide specific error messages for common issues
    if (error?.response?.statusCode === 401) {
      throw new Error('SendGrid API key is invalid. Check SENDGRID_API_KEY in your environment variables.');
    }
    if (error?.response?.statusCode === 403) {
      const body = error?.response?.body;
      if (body && Array.isArray(body) && body.length > 0) {
        const firstError = body[0];
        if (firstError?.message?.includes('sender')) {
          throw new Error(`SendGrid sender verification issue: ${firstError.message}. Verify your sender email (${env.EMAIL_FROM}) in SendGrid dashboard.`);
        }
      }
      throw new Error('SendGrid API key lacks permission to send emails. Check API key permissions in SendGrid dashboard.');
    }
    if (error?.response?.statusCode === 400) {
      const body = error?.response?.body;
      if (body && Array.isArray(body) && body.length > 0) {
        const firstError = body[0];
        if (firstError?.message?.includes('sender') || firstError?.field === 'from') {
          throw new Error(`SendGrid sender error: ${firstError.message}. Verify sender email (${env.EMAIL_FROM}) in SendGrid dashboard under Sender Authentication.`);
        }
        throw new Error(`SendGrid validation error: ${firstError.message}`);
      }
      throw new Error('SendGrid request validation failed. Check email addresses and message format.');
    }
    if (error?.response?.statusCode === 429) {
      throw new Error('SendGrid rate limit exceeded. Please try again later.');
    }
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to SendGrid API. Check your internet connection and SendGrid service status.');
    }

    // Log full error for debugging
    logger.error({ 
      fullError: error,
      errorStack: error?.stack,
    }, 'SendGrid send failed with unexpected error');

    throw error;
  }
};

