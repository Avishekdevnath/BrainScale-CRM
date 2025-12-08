import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Validate SMTP configuration (warns but doesn't prevent server startup)
const validateSmtpConfig = () => {
  const missing: string[] = [];
  
  if (!env.SMTP_USER || env.SMTP_USER.trim() === '') {
    missing.push('SMTP_USER (or GMAIL_USER)');
  }
  
  if (!env.SMTP_PASS || env.SMTP_PASS.trim() === '') {
    missing.push('SMTP_PASS (or GMAIL_APP_PASSWORD)');
  }
  
  if (missing.length > 0) {
    const warningMsg = `⚠️  Missing SMTP configuration: ${missing.join(', ')}. Email functionality will not work. Please set these environment variables in your .env file. See EMAIL_SETUP_GUIDE.md for details.`;
    logger.warn({ missing }, warningMsg);
    return false;
  }
  
  logger.info({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER?.substring(0, 3) + '***', // Log partial email for debugging
  }, 'SMTP configuration validated');
  return true;
};

// Validate on module load (non-blocking)
const isSmtpConfigured = validateSmtpConfig();

// Create reusable transporter
// For port 587: use secure: false (STARTTLS)
// For port 465: use secure: true (SSL/TLS)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  // Allow explicit override via SMTP_SECURE; otherwise infer from port
  secure: typeof env.SMTP_SECURE === 'boolean' ? env.SMTP_SECURE : env.SMTP_PORT === 465,
  requireTLS: env.SMTP_PORT === 587, // Require TLS for port 587 (STARTTLS)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    // Do not fail on invalid certificates (useful for development)
    rejectUnauthorized: env.NODE_ENV === 'production',
  },
  // Connection timeout settings (in milliseconds) - increased for better reliability
  connectionTimeout: 120000, // 120 seconds (2 minutes) for initial connection
  greetingTimeout: 60000, // 60 seconds for SMTP greeting
  socketTimeout: 120000, // 120 seconds (2 minutes) for socket operations
  // Connection pooling for better performance and reliability
  pool: true,
  maxConnections: 5, // Maximum concurrent connections
  maxMessages: 100, // Maximum messages per connection before closing
  // Retry configuration
  rateDelta: 1000, // Time between connection attempts
  rateLimit: 5, // Maximum number of connections per rateDelta
});

// Verify transporter connection on startup (non-blocking, only if configured)
// Note: In production/Kubernetes environments, this may timeout due to network policies
// The verification failure is non-blocking - emails will still attempt to send
if (isSmtpConfigured) {
  // Use a timeout to prevent hanging on verification
  const verifyTimeout = setTimeout(() => {
    logger.warn('SMTP verification is taking longer than expected. This is non-blocking and emails will still attempt to send.');
  }, 10000); // 10 second warning

  transporter.verify((error, success) => {
    clearTimeout(verifyTimeout);
    if (error) {
      const errorDetails: any = {
        error: error.message,
      };
      
      // Add nodemailer-specific error properties if they exist
      if ('code' in error) errorDetails.code = (error as any).code;
      if ('command' in error) errorDetails.command = (error as any).command;
      if ('response' in error) errorDetails.response = (error as any).response;
      
      // Log as warning instead of error since this is non-blocking
      // In Kubernetes, network policies may block SMTP connections
      logger.warn(errorDetails, 'SMTP connection verification failed (non-blocking). Emails will still attempt to send when needed. If emails fail, check SMTP credentials and network connectivity.');
    } else {
      logger.info('SMTP connection verified successfully');
    }
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email with retry logic for connection timeouts
 */
export const sendEmail = async (options: EmailOptions, retryCount = 0): Promise<void> => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 seconds between retries

  // Check if SMTP is configured before attempting to send
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    const error = new Error('SMTP configuration is missing. Please set SMTP_USER and SMTP_PASS environment variables.');
    logger.error({ 
      error: error.message,
      to: options.to,
      subject: options.subject,
    }, 'Cannot send email: SMTP not configured');
    throw error;
  }

  try {
    // Verify connection before sending (only on retries to check connectivity)
    if (retryCount > 0) {
      try {
        await transporter.verify();
        logger.info({ 
          attempt: retryCount + 1,
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
        }, 'SMTP connection verified, retrying send');
      } catch (verifyError: any) {
        logger.warn({ 
          error: verifyError.message,
          code: verifyError.code,
          attempt: retryCount + 1,
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
        }, 'SMTP connection verification failed on retry, will attempt to send anyway');
        // Continue with send attempt even if verify fails
      }
    }

    const info = await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      replyTo: env.EMAIL_REPLY_TO,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    });

    logger.info({ 
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      retryAttempt: retryCount,
    }, 'Email sent successfully');
  } catch (error: any) {
    // Enhanced error logging
    const errorDetails: any = {
      to: options.to,
      subject: options.subject,
      error: error.message,
      retryAttempt: retryCount,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
    };

    // Add nodemailer-specific error details
    if (error.code) {
      errorDetails.code = error.code;
    }
    if (error.command) {
      errorDetails.command = error.command;
    }
    if (error.response) {
      errorDetails.response = error.response;
    }
    if (error.responseCode) {
      errorDetails.responseCode = error.responseCode;
    }

    // Retry logic for connection/timeout errors
    const isRetryableError = 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNECTION' || 
      error.code === 'ESOCKET' ||
      (error.command === 'CONN' && retryCount < MAX_RETRIES);

    if (isRetryableError && retryCount < MAX_RETRIES) {
      logger.warn({
        ...errorDetails,
        nextRetryIn: RETRY_DELAY,
      }, 'Email send failed with retryable error, will retry');

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));

      // Retry the send
      return sendEmail(options, retryCount + 1);
    }

    logger.error(errorDetails, 'Failed to send email');
    
    // Provide more helpful error messages
    if (error.code === 'EAUTH') {
      throw new Error('SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS credentials.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new Error(`Cannot connect to SMTP server at ${env.SMTP_HOST}:${env.SMTP_PORT}. Please check your SMTP_HOST and SMTP_PORT settings, and ensure the server is reachable from your network.`);
    } else if (error.code === 'EENVELOPE') {
      throw new Error(`Invalid email address: ${options.to}`);
    }
    
    throw error;
  }
};

export const sendInvitationEmail = async (
  email: string,
  workspaceName: string,
  invitationToken: string,
  inviterName: string
): Promise<void> => {
  const invitationUrl = `${env.APP_URL}/accept-invitation?token=${invitationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">You've been invited to join ${workspaceName}</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>${workspaceName}</strong> on BrainScale CRM.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${invitationUrl}</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Invitation to join ${workspaceName} on BrainScale CRM`,
    html,
  });
};

type VerificationEmailOptions = {
  otpCode: string;
  otpExpiresAt: Date;
  isResend?: boolean;
};

export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
  userName?: string,
  options?: VerificationEmailOptions
): Promise<void> => {
  if (!options?.otpCode || !options?.otpExpiresAt) {
    throw new Error('OTP code and expiration time are required to send verification email.');
  }

  const verificationUrl = `${env.APP_URL}/verify-email?token=${verificationToken}`;
  const { emailVerificationTemplate, resendVerificationTemplate } = await import('./email-templates');

  const html = (options.isResend ? resendVerificationTemplate : emailVerificationTemplate)(
    verificationUrl,
    options.otpCode,
    options.otpExpiresAt,
    userName
  );

  await sendEmail({
    to: email,
    subject: 'Verify your email address - BrainScale CRM',
    html,
  });
};

export const sendResendVerificationEmail = async (
  email: string,
  verificationToken: string,
  userName: string | undefined,
  otpCode: string,
  otpExpiresAt: Date
) => {
  await sendVerificationEmail(email, verificationToken, userName, {
    otpCode,
    otpExpiresAt,
    isResend: true,
  });
};

export const sendTemporaryPasswordEmail = async (
  email: string,
  userName: string,
  workspaceName: string,
  temporaryPassword: string
): Promise<void> => {
  const loginUrl = `${env.APP_URL}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${workspaceName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Welcome to ${workspaceName}</h2>
          <p>Hi ${userName},</p>
          <p>Your account has been created for the workspace <strong>${workspaceName}</strong> on BrainScale CRM.</p>
          <p>You can log in using the following temporary password:</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">
              ${temporaryPassword}
            </p>
          </div>
          <p><strong>Important:</strong> You need to complete your account setup before gaining full access to the workspace.</p>
          <p>After logging in, you will need to:</p>
          <ol style="margin-left: 20px; padding-left: 0;">
            <li>Change your temporary password to a new secure password</li>
            <li>Accept the workspace agreement/terms</li>
          </ol>
          <p>Once completed, you will have full access to your workspace with the permissions assigned to you.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Log In Now
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${loginUrl}</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            For security reasons, please complete your account setup immediately after logging in.
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Welcome to ${workspaceName} - Your Account Details`,
    html,
  });
};

export const sendPasswordChangeOtpEmail = async (
  email: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): Promise<void> => {
  const { passwordChangeOtpTemplate } = await import('./email-templates');
  const html = passwordChangeOtpTemplate(otpCode, otpExpiresAt, userName);

  await sendEmail({
    to: email,
    subject: 'Change Your Password - BrainScale CRM',
    html,
  });
};

export const sendResetPasswordOtpEmail = async (
  email: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): Promise<void> => {
  const { resetPasswordOtpTemplate } = await import('./email-templates');
  const html = resetPasswordOtpTemplate(otpCode, otpExpiresAt, userName);

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - BrainScale CRM',
    html,
  });
};

