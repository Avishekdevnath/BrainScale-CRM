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

    logger.info(
      {
        statusCode: response.statusCode,
        messageId: response.headers['x-message-id'],
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

    if (error?.response?.statusCode === 401) {
      throw new Error('SendGrid API key is invalid. Check SENDGRID_API_KEY.');
    }
    if (error?.response?.statusCode === 403) {
      throw new Error('SendGrid API key lacks permission to send emails.');
    }
    if (error?.response?.statusCode === 429) {
      throw new Error('SendGrid rate limit exceeded. Please try again later.');
    }

    throw error;
  }
};

