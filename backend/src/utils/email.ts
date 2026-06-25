import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendEmailWithResend } from './email-resend';
import { queueTransactionalEmail } from '../modules/emails/helpers/queue-helpers';
import {
  emailVerificationTemplate,
  resendVerificationTemplate,
  passwordChangeOtpTemplate,
  resetPasswordOtpTemplate,
  teamChatMentionTemplate,
  teamChatDirectMessageTemplate,
} from './email-templates';

if (!env.RESEND_API_KEY) {
  logger.warn('RESEND_API_KEY missing. Emails will fail until set.');
} else {
  logger.info('Resend configured');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const BRAND_NAME = env.EMAIL_FROM_NAME || 'BrainScale CRM';
const withBrand = (subject: string) => `${BRAND_NAME} – ${subject}`;

const queueOrSendTransactionalEmail = async (
  options: EmailOptions,
  queueOptions: {
    workspaceId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  },
  subject: string
) => {
  if (env.EMAIL_QUEUE_ENABLED) {
    await queueTransactionalEmail(options.to, subject, options.html, {
      workspaceId: queueOptions.workspaceId || 'system',
      userId: queueOptions.userId,
      metadata: queueOptions.metadata,
    });
    return;
  }

  await sendEmail(options);
};

/**
 * Send email with retry logic for connection timeouts
 */
export const sendEmail = async (options: EmailOptions, retryCount = 0): Promise<void> => {
  if (process.env.EMAIL_DISABLED === 'true') {
    logger.info({ to: options.to, subject: options.subject }, 'Email sending disabled, skipping');
    return;
  }

  await sendEmailWithResend(options, retryCount);
};

export const sendInvitationEmail = async (
  email: string,
  workspaceName: string,
  invitationToken: string,
  inviterName: string,
  options?: {
    workspaceId?: string;
    userId?: string;
  }
): Promise<void> => {
  const invitationUrl = `${env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
  
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

  if (env.EMAIL_QUEUE_ENABLED && options?.workspaceId) {
    await queueTransactionalEmail(
      email,
      withBrand(`Invitation to join ${workspaceName}`),
      html,
      {
        workspaceId: options.workspaceId,
        userId: options.userId,
        metadata: {
          invitationToken,
          inviterName,
          workspaceName,
          type: 'INVITATION',
        },
      }
    );
    return;
  }

  await sendEmail({
    to: email,
    subject: withBrand(`Invitation to join ${workspaceName}`),
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
  userName?: string,
  options?: VerificationEmailOptions
): Promise<void> => {
  if (!options?.otpCode || !options?.otpExpiresAt) {
    throw new Error('OTP code and expiration time are required to send verification email.');
  }

  const html = (options.isResend ? resendVerificationTemplate : emailVerificationTemplate)(
    options.otpCode,
    options.otpExpiresAt,
    userName
  );

  // Auth OTP emails are latency-critical: send synchronously so failures surface
  // to the caller instead of sitting in the queue.
  await sendEmail({
    to: email,
    subject: withBrand('Verify your email address'),
    html,
  });
};

export const sendResendVerificationEmail = async (
  email: string,
  userName: string | undefined,
  otpCode: string,
  otpExpiresAt: Date
) => {
  await sendVerificationEmail(email, userName, {
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
  const loginUrl = `${env.FRONTEND_URL}/login`;
  
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
    subject: withBrand(`Welcome to ${workspaceName}`),
    html,
  });
};

export const sendPasswordChangeOtpEmail = async (
  email: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): Promise<void> => {
  const html = passwordChangeOtpTemplate(otpCode, otpExpiresAt, userName);

  await sendEmail({
    to: email,
    subject: withBrand('Password change code'),
    html,
  });
};

export const sendResetPasswordOtpEmail = async (
  email: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): Promise<void> => {
  const html = resetPasswordOtpTemplate(otpCode, otpExpiresAt, userName);

  await sendEmail({
    to: email,
    subject: withBrand('Password reset code'),
    html,
  });
};

export const sendTeamChatDirectMessageEmail = async (
  email: string,
  senderName: string,
  messagePreview: string,
  options?: {
    workspaceId?: string;
    userId?: string;
  }
): Promise<void> => {
  // Link points to the DM thread with the sender (keyed by the recipient-facing userId).
  const dmUrl = `${env.FRONTEND_URL}/app/team-chat/dm/${options?.userId ?? ''}`;
  const html = teamChatDirectMessageTemplate({
    senderName,
    messagePreview,
    dmUrl,
  });

  await queueOrSendTransactionalEmail(
    {
      to: email,
      subject: withBrand(`${senderName} sent you a direct message`),
      html,
    },
    {
      workspaceId: options?.workspaceId,
      userId: options?.userId,
      metadata: {
        type: 'TEAM_CHAT_DIRECT_MESSAGE',
        senderName,
      },
    },
    withBrand(`${senderName} sent you a direct message`)
  );
};

export const sendTeamChatMentionEmail = async (
  email: string,
  senderName: string,
  channelName: string,
  messagePreview: string,
  options?: {
    workspaceId?: string;
    userId?: string;
  }
): Promise<void> => {
  const teamChatUrl = `${env.FRONTEND_URL}/app/team-chat`;
  const html = teamChatMentionTemplate({
    senderName,
    channelName,
    messagePreview,
    teamChatUrl,
  });

  await queueOrSendTransactionalEmail(
    {
      to: email,
      subject: withBrand(`${senderName} mentioned you in #${channelName}`),
      html,
    },
    {
      workspaceId: options?.workspaceId,
      userId: options?.userId,
      metadata: {
        type: 'TEAM_CHAT_MENTION',
        senderName,
        channelName,
      },
    },
    withBrand(`${senderName} mentioned you in #${channelName}`)
  );
};

