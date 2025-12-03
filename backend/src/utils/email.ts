import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Create reusable transporter
// For port 587: use secure: false (STARTTLS)
// For port 465: use secure: true (SSL/TLS)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // Auto-detect: 465 = SSL, 587 = STARTTLS
  requireTLS: env.SMTP_PORT === 587, // Require TLS for port 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    // Do not fail on invalid certificates (useful for development)
    rejectUnauthorized: env.NODE_ENV === 'production',
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      replyTo: env.EMAIL_REPLY_TO,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
    });

    logger.info({ messageId: info.messageId }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to send email');
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

