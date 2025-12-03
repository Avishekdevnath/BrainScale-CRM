import { env } from '../config/env';

/**
 * Base email template wrapper
 */
const baseTemplate = (content: string, title?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'BrainScale CRM'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: white;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #4F46E5;">
            <h1 style="color: #4F46E5; margin: 0;">BrainScale CRM</h1>
          </div>
          ${content}
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated email from BrainScale CRM. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} BrainScale CRM. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Followup assignment notification template
 */
export const followupAssignmentTemplate = (
  studentName: string,
  groupName: string,
  dueDate: Date,
  notes?: string | null,
  creatorName?: string
): string => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = `
    <h2 style="color: #4F46E5;">New Follow-up Assigned</h2>
    <p>Hi there,</p>
    <p>${creatorName ? `${creatorName} has` : 'You have been'} assigned a new follow-up task:</p>
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Student:</strong> ${studentName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Group:</strong> ${groupName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      ${notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
    </div>
    <p style="margin-top: 30px;">
      <a href="${env.APP_URL}/followups" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Follow-up
      </a>
    </p>
  `;

  return baseTemplate(content, 'New Follow-up Assigned');
};

/**
 * Followup reminder template (for overdue or upcoming)
 */
export const followupReminderTemplate = (
  studentName: string,
  groupName: string,
  dueDate: Date,
  isOverdue: boolean,
  notes?: string | null
): string => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusText = isOverdue ? 'is overdue' : 'is due soon';
  const statusColor = isOverdue ? '#dc2626' : '#f59e0b';

  const content = `
    <h2 style="color: ${statusColor};">Follow-up Reminder</h2>
    <p>Hi there,</p>
    <p>You have a follow-up task that ${statusText}:</p>
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
      <p style="margin: 0;"><strong>Student:</strong> ${studentName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Group:</strong> ${groupName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      ${notes ? `<p style="margin: 10px 0 0 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
    </div>
    <p style="margin-top: 30px;">
      <a href="${env.APP_URL}/followups" 
         style="background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Follow-up
      </a>
    </p>
  `;

  return baseTemplate(content, 'Follow-up Reminder');
};

/**
 * Daily digest template
 */
export const dailyDigestTemplate = (
  workspaceName: string,
  stats: {
    callsToday: number;
    callsThisWeek: number;
    pendingFollowups: number;
    overdueFollowups: number;
    newStudents: number;
  },
  recentActivity: Array<{
    type: string;
    description: string;
    date: Date;
  }>
): string => {
  const content = `
    <h2 style="color: #4F46E5;">Daily Summary - ${workspaceName}</h2>
    <p>Hi there,</p>
    <p>Here's your daily summary for <strong>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>:</p>
    
    <div style="margin: 30px 0;">
      <h3 style="color: #4F46E5; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Quick Stats</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #3b82f6;">${stats.callsToday}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Calls Today</p>
        </div>
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">${stats.callsThisWeek}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Calls This Week</p>
        </div>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${stats.pendingFollowups}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Pending Follow-ups</p>
        </div>
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #dc2626;">${stats.overdueFollowups}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Overdue Follow-ups</p>
        </div>
      </div>
    </div>

    ${recentActivity.length > 0 ? `
      <div style="margin: 30px 0;">
        <h3 style="color: #4F46E5; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Recent Activity</h3>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${recentActivity.slice(0, 10).map((activity) => `
            <li style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
              <strong>${activity.type}</strong> - ${activity.description}
              <br><small style="color: #666;">${new Date(activity.date).toLocaleString()}</small>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <p style="margin-top: 30px;">
      <a href="${env.APP_URL}/dashboard" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Dashboard
      </a>
    </p>
  `;

  return baseTemplate(content, `Daily Summary - ${workspaceName}`);
};

/**
 * Weekly digest template
 */
export const weeklyDigestTemplate = (
  workspaceName: string,
  stats: {
    totalCalls: number;
    totalFollowups: number;
    completedFollowups: number;
    newStudents: number;
    topGroups: Array<{ name: string; studentCount: number }>;
  },
  weekStart: Date,
  weekEnd: Date
): string => {
  const content = `
    <h2 style="color: #4F46E5;">Weekly Summary - ${workspaceName}</h2>
    <p>Hi there,</p>
    <p>Here's your weekly summary for <strong>${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>:</p>
    
    <div style="margin: 30px 0;">
      <h3 style="color: #4F46E5; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Weekly Stats</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #3b82f6;">${stats.totalCalls}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Total Calls</p>
        </div>
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">${stats.completedFollowups}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Completed Follow-ups</p>
        </div>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">${stats.newStudents}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">New Students</p>
        </div>
        <div style="background-color: #f3e8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #8b5cf6;">${stats.totalFollowups}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Total Follow-ups</p>
        </div>
      </div>
    </div>

    ${stats.topGroups.length > 0 ? `
      <div style="margin: 30px 0;">
        <h3 style="color: #4F46E5; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Top Groups</h3>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${stats.topGroups.slice(0, 5).map((group, index) => `
            <li style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
              <span style="display: inline-block; width: 30px; height: 30px; background-color: #4F46E5; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px;">${index + 1}</span>
              <strong>${group.name}</strong> - ${group.studentCount} students
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <p style="margin-top: 30px;">
      <a href="${env.APP_URL}/dashboard" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Dashboard
      </a>
    </p>
  `;

  return baseTemplate(content, `Weekly Summary - ${workspaceName}`);
};

/**
 * Email verification template
 */
const formatOtpExpiry = (expiresAt: Date) =>
  new Date(expiresAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const verificationEmailContent = ({
  verificationUrl,
  otpCode,
  otpExpiresAt,
  userName,
  isResend,
}: {
  verificationUrl: string;
  otpCode: string;
  otpExpiresAt: Date;
  userName?: string;
  isResend?: boolean;
}): string => {
  const expiresText = formatOtpExpiry(otpExpiresAt);

  return `
    <h2 style="color: #4F46E5;">Verify Your Email Address</h2>
    <p>Hi${userName ? ` ${userName}` : ''},</p>
    <p>${isResend ? 'You requested a new verification email.' : 'Thank you for signing up for BrainScale CRM!'} Verify your email using either option below:</p>

    <div style="margin: 24px 0; padding: 20px; background-color: #eef2ff; border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; letter-spacing: 0.1em; color: #4F46E5; text-transform: uppercase;">Your One-Time Code</p>
      <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; color: #1f2937;">${otpCode}</p>
      <p style="margin-top: 12px; font-size: 12px; color: #4b5563;">Code expires on <strong>${expiresText}</strong></p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Verify Email with Link
      </a>
    </p>

    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <span style="display: inline-block; margin-top: 8px; background-color: #f9fafb; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationUrl}</span>
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      This verification link expires in 24 hours and the code above expires soon, so please verify your email as soon as possible. If you didn't request this, you can safely ignore this email.
    </p>
  `;
};

export const emailVerificationTemplate = (
  verificationUrl: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): string => {
  return baseTemplate(
    verificationEmailContent({
      verificationUrl,
      otpCode,
      otpExpiresAt,
      userName,
    }),
    'Verify Your Email Address'
  );
};

export const resendVerificationTemplate = (
  verificationUrl: string,
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): string => {
  return baseTemplate(
    verificationEmailContent({
      verificationUrl,
      otpCode,
      otpExpiresAt,
      userName,
      isResend: true,
    }),
    'Verify Your Email Address'
  );
};

/**
 * Password change OTP template
 */
const passwordChangeOtpContent = ({
  otpCode,
  otpExpiresAt,
  userName,
  isResend,
}: {
  otpCode: string;
  otpExpiresAt: Date;
  userName?: string;
  isResend?: boolean;
}): string => {
  const expiresText = formatOtpExpiry(otpExpiresAt);
  const loginUrl = `${env.APP_URL}/login`;

  return `
    <h2 style="color: #4F46E5;">Change Your Password</h2>
    <p>Hi${userName ? ` ${userName}` : ''},</p>
    <p>${isResend ? 'You requested a new password change code.' : 'You requested to change your password.'} Use the code below to complete the process:</p>

    <div style="margin: 24px 0; padding: 20px; background-color: #eef2ff; border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; letter-spacing: 0.1em; color: #4F46E5; text-transform: uppercase;">Your One-Time Code</p>
      <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; color: #1f2937;">${otpCode}</p>
      <p style="margin-top: 12px; font-size: 12px; color: #4b5563;">Code expires on <strong>${expiresText}</strong></p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}"
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Go to Login
      </a>
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      This code expires in 10 minutes. If you didn't request a password change, please ignore this email and consider changing your password immediately for security.
    </p>
  `;
};

export const passwordChangeOtpTemplate = (
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): string => {
  return baseTemplate(
    passwordChangeOtpContent({
      otpCode,
      otpExpiresAt,
      userName,
    }),
    'Change Your Password'
  );
};

/**
 * Reset password OTP template
 */
const resetPasswordOtpContent = ({
  otpCode,
  otpExpiresAt,
  userName,
  isResend,
}: {
  otpCode: string;
  otpExpiresAt: Date;
  userName?: string;
  isResend?: boolean;
}): string => {
  const expiresText = formatOtpExpiry(otpExpiresAt);
  const resetUrl = `${env.APP_URL}/reset-password`;

  return `
    <h2 style="color: #4F46E5;">Reset Your Password</h2>
    <p>Hi${userName ? ` ${userName}` : ''},</p>
    <p>${isResend ? 'You requested a new password reset code.' : 'You requested to reset your password.'} Use the code below to complete the process:</p>

    <div style="margin: 24px 0; padding: 20px; background-color: #eef2ff; border-radius: 12px; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; letter-spacing: 0.1em; color: #4F46E5; text-transform: uppercase;">Your One-Time Code</p>
      <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 0.3em; color: #1f2937;">${otpCode}</p>
      <p style="margin-top: 12px; font-size: 12px; color: #4b5563;">Code expires on <strong>${expiresText}</strong></p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Password
      </a>
    </p>

    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      This code expires in 10 minutes. If you didn't request a password reset, please ignore this email and consider changing your password immediately for security.
    </p>
  `;
};

export const resetPasswordOtpTemplate = (
  otpCode: string,
  otpExpiresAt: Date,
  userName?: string
): string => {
  return baseTemplate(
    resetPasswordOtpContent({
      otpCode,
      otpExpiresAt,
      userName,
    }),
    'Reset Your Password'
  );
};

