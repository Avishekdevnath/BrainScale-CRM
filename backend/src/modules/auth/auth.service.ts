import { prisma } from '../../db/client';
import { hashPassword, comparePassword } from '../../auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../auth/jwt';
import { AppError } from '../../middleware/error-handler';
import {
  SignupInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  VerifyEmailOtpInput,
  ResendVerificationOtpInput,
  ChangePasswordInput,
  CompleteMemberSetupInput,
  RequestPasswordChangeOtpInput,
  ChangePasswordWithOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ResendPasswordChangeOtpInput,
  ResendResetPasswordOtpInput,
} from './auth.schemas';
import { acceptInvitation } from '../invitations/invitation.service';
import { 
  sendVerificationEmail,
  sendResetPasswordOtpEmail,
  sendPasswordChangeOtpEmail 
} from '../../utils/email';
import { randomBytes, randomInt } from 'crypto';
import { logger } from '../../config/logger';
import bcrypt from 'bcryptjs';

const EMAIL_VERIFICATION_PURPOSE = 'verify_email';
const SIGNUP_VERIFICATION_PURPOSE = 'signup_verify_email'; // Separate purpose for signup verification
const PASSWORD_CHANGE_PURPOSE = 'change_password';
const RESET_PASSWORD_PURPOSE = 'reset_password';
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_WINDOW_MINUTES = 2;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_RESENDS_PER_WINDOW = 10;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

const generateOtpCode = () => String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);
const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const EMAIL_VERIFICATION_RESEND_WINDOW_MS = OTP_RESEND_WINDOW_MINUTES * 60 * 1000;

const ensureUserVerificationToken = async (
  user: {
    id: string;
    verificationToken: string | null;
    verificationTokenExpiresAt: Date | null;
  }
): Promise<string> => {
  const now = new Date();
  if (user.verificationToken && user.verificationTokenExpiresAt && user.verificationTokenExpiresAt > now) {
    return user.verificationToken;
  }

  const newToken = randomBytes(32).toString('hex');
  const verificationTokenExpiresAt = addHours(now, EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: newToken,
      verificationTokenExpiresAt,
    },
  });

  return newToken;
};

const issueEmailVerificationOtp = async ({
  userId,
  email,
  name,
  verificationToken,
  isResend = false,
}: {
  userId: string;
  email: string;
  name?: string | null;
  verificationToken: string;
  isResend?: boolean;
}) => {
  const now = new Date();
  
  // Check if user is already verified (safety check)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (user?.emailVerified) {
    throw new AppError(400, 'Email address is already verified');
  }

  const existing = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId,
        purpose: EMAIL_VERIFICATION_PURPOSE,
      },
    },
  });

  // For unverified users: allow retry every 2 minutes
  const MIN_RETRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  if (existing) {
    const timeSinceLastAttempt = now.getTime() - existing.createdAt.getTime();
    
    // If less than 2 minutes have passed, tell user when they can retry
    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
      const secondsRemaining = Math.ceil((MIN_RETRY_INTERVAL_MS - timeSinceLastAttempt) / 1000);
      const minutesRemaining = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      
      let errorMessage: string;
      if (minutesRemaining > 0) {
        errorMessage = `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds > 1 ? 's' : ''}` : ''}. You can retry until your account is verified.`;
      } else {
        errorMessage = `Please wait ${seconds} second${seconds > 1 ? 's' : ''}. You can retry until your account is verified.`;
      }
      
      const canRetryAt = new Date(existing.createdAt.getTime() + MIN_RETRY_INTERVAL_MS);
      
      throw new AppError(429, errorMessage, {
        retryAfter: secondsRemaining,
        canRetryAt: canRetryAt.toISOString(),
      });
    }
  }

  const otpCode = generateOtpCode();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = addMinutes(now, OTP_EXPIRY_MINUTES);

  // IMPORTANT: Send email FIRST before creating OTP record
  try {
    await sendVerificationEmail(email, verificationToken, name || undefined, {
      otpCode,
      otpExpiresAt: expiresAt,
      isResend,
    });
  } catch (error) {
    // If email fails, don't create OTP record
    logger.error({ error, userId, email }, 'Failed to send verification email');
    throw new AppError(500, 'Failed to send verification email. Please check your email configuration and try again.');
  }

  // Only create OTP record if email was sent successfully
  await prisma.emailVerification.upsert({
    where: {
      userId_purpose: {
        userId,
        purpose: EMAIL_VERIFICATION_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: {
        increment: 1,  // Fix: Increment instead of setting to 1
      },
      createdAt: now, // Update to current time for 2-minute window tracking
    },
    create: {
      userId,
      purpose: EMAIL_VERIFICATION_PURPOSE,
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: now,
    },
  });
};

/**
 * Generic OTP verification function for any purpose
 */
const verifyOtpForPurpose = async (userId: string, otp: string, purpose: string) => {
  const verification = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId,
        purpose,
      },
    },
  });

  if (!verification) {
    throw new AppError(400, 'Invalid or expired verification code. Please request a new one.');
  }

  const now = new Date();

  if (verification.expiresAt < now) {
    await prisma.emailVerification
      .delete({
        where: {
          userId_purpose: {
            userId,
            purpose,
          },
        },
      })
      .catch(() => undefined);

    throw new AppError(400, 'Verification code has expired. Please request a new one.');
  }

  const isValid = await bcrypt.compare(otp, verification.codeHash);

  if (!isValid) {
    const updated = await prisma.emailVerification.update({
      where: {
        userId_purpose: {
          userId,
          purpose,
        },
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
      select: {
        attempts: true,
      },
    });

    if (updated.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.emailVerification
        .delete({
          where: {
            userId_purpose: {
              userId,
              purpose,
            },
          },
        })
        .catch(() => undefined);

      throw new AppError(400, 'Maximum attempts reached. Please request a new verification code.');
    }

    throw new AppError(400, 'Invalid verification code. Please try again.');
  }

  // Delete the OTP record after successful verification
  await prisma.emailVerification.delete({
    where: {
      userId_purpose: {
        userId,
        purpose,
      },
    },
  });

  return true;
};

/**
 * Issue OTP for password change
 */
const issuePasswordChangeOtp = async ({
  userId,
  email,
  name,
  isResend = false,
}: {
  userId: string;
  email: string;
  name?: string | null;
  isResend?: boolean;
}) => {
  const now = new Date();
  const existing = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId,
        purpose: PASSWORD_CHANGE_PURPOSE,
      },
    },
  });

  const MIN_RETRY_INTERVAL_MS = OTP_RESEND_WINDOW_MINUTES * 60 * 1000;

  if (existing) {
    const timeSinceLastAttempt = now.getTime() - existing.createdAt.getTime();

    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
      const secondsRemaining = Math.ceil((MIN_RETRY_INTERVAL_MS - timeSinceLastAttempt) / 1000);
      const minutesRemaining = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;

      let errorMessage: string;
      if (minutesRemaining > 0) {
        errorMessage = `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds > 1 ? 's' : ''}` : ''} before requesting a new code.`;
      } else {
        errorMessage = `Please wait ${seconds} second${seconds > 1 ? 's' : ''} before requesting a new code.`;
      }

      const canRetryAt = new Date(existing.createdAt.getTime() + MIN_RETRY_INTERVAL_MS);

      throw new AppError(429, errorMessage, {
        retryAfter: secondsRemaining,
        canRetryAt: canRetryAt.toISOString(),
      });
    }
  }

  const otpCode = generateOtpCode();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = addMinutes(now, OTP_EXPIRY_MINUTES);

  // IMPORTANT: Send email FIRST before creating OTP record
  try {
    await sendPasswordChangeOtpEmail(email, otpCode, expiresAt, name || undefined);
  } catch (error) {
    // If email fails, don't create OTP record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      userId, 
      email,
      provider: process.env.EMAIL_PROVIDER,
      hasApiKey: Boolean(process.env.SENDGRID_API_KEY),
    }, 'Failed to send password change OTP email');
    
    // Preserve the original error message if it's informative
    if (error instanceof Error && (
      error.message.includes('SendGrid') || 
      error.message.includes('SMTP') ||
      error.message.includes('authentication') ||
      error.message.includes('sender') ||
      error.message.includes('verification')
    )) {
      throw new AppError(500, error.message);
    }
    
    throw new AppError(500, `Failed to send password change code: ${errorMessage}. Please check your email configuration and try again.`);
  }

  // Only create OTP record if email was sent successfully
  await prisma.emailVerification.upsert({
    where: {
      userId_purpose: {
        userId,
        purpose: PASSWORD_CHANGE_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: {
        increment: 1,  // Fix: Increment instead of setting to 1
      },
      createdAt: now,
    },
    create: {
      userId,
      purpose: PASSWORD_CHANGE_PURPOSE,
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: now,
    },
  });
};

/**
 * Issue OTP for password reset
 */
const issueResetPasswordOtp = async ({
  userId,
  email,
  name,
  isResend = false,
}: {
  userId: string;
  email: string;
  name?: string | null;
  isResend?: boolean;
}) => {
  const now = new Date();
  const existing = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId,
        purpose: RESET_PASSWORD_PURPOSE,
      },
    },
  });

  const MIN_RETRY_INTERVAL_MS = OTP_RESEND_WINDOW_MINUTES * 60 * 1000;

  if (existing) {
    const timeSinceLastAttempt = now.getTime() - existing.createdAt.getTime();

    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
      const secondsRemaining = Math.ceil((MIN_RETRY_INTERVAL_MS - timeSinceLastAttempt) / 1000);
      const minutesRemaining = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;

      let errorMessage: string;
      if (minutesRemaining > 0) {
        errorMessage = `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds > 1 ? 's' : ''}` : ''} before requesting a new code.`;
      } else {
        errorMessage = `Please wait ${seconds} second${seconds > 1 ? 's' : ''} before requesting a new code.`;
      }

      const canRetryAt = new Date(existing.createdAt.getTime() + MIN_RETRY_INTERVAL_MS);

      throw new AppError(429, errorMessage, {
        retryAfter: secondsRemaining,
        canRetryAt: canRetryAt.toISOString(),
      });
    }
  }

  const otpCode = generateOtpCode();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = addMinutes(now, OTP_EXPIRY_MINUTES);

  // IMPORTANT: Send email FIRST before creating OTP record
  try {
    await sendResetPasswordOtpEmail(email, otpCode, expiresAt, name || undefined);
  } catch (error) {
    // If email fails, don't create OTP record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      userId, 
      email,
      provider: process.env.EMAIL_PROVIDER,
      hasApiKey: Boolean(process.env.SENDGRID_API_KEY),
    }, 'Failed to send password reset OTP email');
    
    // Preserve the original error message if it's informative
    if (error instanceof Error && (
      error.message.includes('SendGrid') || 
      error.message.includes('SMTP') ||
      error.message.includes('authentication') ||
      error.message.includes('sender') ||
      error.message.includes('verification')
    )) {
      throw new AppError(500, error.message);
    }
    
    throw new AppError(500, `Failed to send password reset code: ${errorMessage}. Please check your email configuration and try again.`);
  }

  // Only create OTP record if email was sent successfully
  await prisma.emailVerification.upsert({
    where: {
      userId_purpose: {
        userId,
        purpose: RESET_PASSWORD_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: {
        increment: 1,  // Fix: Increment instead of setting to 1
      },
      createdAt: now,
    },
    create: {
      userId,
      purpose: RESET_PASSWORD_PURPOSE,
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: now,
    },
  });
};

export const signup = async (data: SignupInput) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Generate verification token
  const verificationToken = randomBytes(32).toString('hex');
  const verificationTokenExpiresAt = new Date();
  verificationTokenExpiresAt.setHours(verificationTokenExpiresAt.getHours() + 24); // 24 hours expiry

  // Generate OTP code BEFORE creating user (needed for email)
  const otpCode = generateOtpCode();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

  // IMPORTANT: Send email FIRST before creating user account
  try {
    await sendVerificationEmail(data.email, verificationToken, data.name, {
      otpCode,
      otpExpiresAt: expiresAt,
      isResend: false,
    });
  } catch (error) {
    // If email fails, don't create user account
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorDetails: error,
      email: data.email,
      provider: process.env.EMAIL_PROVIDER,
      hasApiKey: Boolean(process.env.SENDGRID_API_KEY),
    }, 'Failed to send verification email during signup');
    
    // Preserve the original error message if it's informative
    if (error instanceof Error && (
      error.message.includes('SendGrid') || 
      error.message.includes('SMTP') ||
      error.message.includes('authentication') ||
      error.message.includes('sender') ||
      error.message.includes('verification')
    )) {
      throw new AppError(500, error.message);
    }
    
    throw new AppError(500, `Failed to send verification email: ${errorMessage}. Please check your email configuration and try again.`);
  }

  // Only create user if email was sent successfully
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      verificationToken: true,
      createdAt: true,
    },
  });

  // Create signup verification OTP record AFTER user is created and email is sent
  // Use separate purpose to avoid conflicts with other verification flows
  await prisma.emailVerification.upsert({
    where: {
      userId_purpose: {
        userId: user.id,
        purpose: SIGNUP_VERIFICATION_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: new Date(),
    },
    create: {
      userId: user.id,
      purpose: SIGNUP_VERIFICATION_PURPOSE,
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: new Date(),
    },
  });

  // Handle invitation acceptance if token provided
  let invitationResult = null;
  if (data.invitationToken) {
    try {
      invitationResult = await acceptInvitation(data.invitationToken, user.id);
    } catch (error) {
      // If invitation fails, user is still created but not added to workspace
      // Log error but don't fail signup
      logger.error({ error, userId: user.id }, 'Failed to accept invitation during signup');
    }
  }

  // Email is guaranteed to be sent (or error thrown), so build success response
  return {
    user,
    invitation: invitationResult,
    emailSent: true,
    message: invitationResult
      ? `Account created and added to ${invitationResult.workspaceName}. Please check your email to verify your account.`
      : 'Account created successfully. Please check your email to verify your account before logging in.',
    actionRequired: ['Check your email inbox', 'Click the verification link or enter the OTP code'],
  };
};

export const login = async (data: LoginInput) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  // Verify password
  const isValidPassword = await comparePassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'Invalid email or password');
  }

  // Type assertion needed until Prisma Client regenerates with new fields
  const userWithFields = user as typeof user & {
    mustChangePassword: boolean;
    temporaryPassword: boolean;
  };
  
  // Check if email is verified - allow login for admin-created users with temporary password
  if (!user.emailVerified && !userWithFields.temporaryPassword) {
    throw new AppError(403, 'Please verify your email address before logging in. Check your inbox for the verification link.');
  }

  // Check if password change is required and setup is not completed
  const defaultWorkspace = user.memberships[0];
  const needsSetup = defaultWorkspace && userWithFields.mustChangePassword && userWithFields.temporaryPassword;
  const setupCompleted = (defaultWorkspace as typeof defaultWorkspace & { setupCompleted?: boolean })?.setupCompleted ?? true;

  if (userWithFields.mustChangePassword) {
    // Check if this is a member who needs to complete setup
    if (needsSetup && !setupCompleted) {
      const refreshToken = signRefreshToken(user.id);
      const provisionalAccessToken = signAccessToken({
        sub: user.id,
        workspaceId: defaultWorkspace?.workspaceId || '',
        role: defaultWorkspace?.role || 'MEMBER',
      });

      // Ensure workspace relation exists
      if (!defaultWorkspace?.workspace) {
        throw new AppError(500, 'Workspace data is missing. Please contact support.');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken: provisionalAccessToken,
        refreshToken,
        workspace: {
          id: defaultWorkspace.workspace.id,
          name: defaultWorkspace.workspace.name,
          role: defaultWorkspace.role,
        },
        requiresSetup: true,
        requiresPasswordChange: true,
        message: 'Please complete your account setup by changing your password and accepting the agreement.',
      };
    }

    // Still generate tokens but indicate password change is required
    if (!defaultWorkspace) {
      const refreshToken = signRefreshToken(user.id);
      const provisionalAccessToken = signAccessToken({
        sub: user.id,
        workspaceId: '',
        role: 'ADMIN',
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken: provisionalAccessToken,
        refreshToken,
        workspace: null,
        requiresPasswordChange: true,
        message: 'Password change required. Please change your password before continuing.',
      };
    }

    // Ensure workspace relation exists
    if (!defaultWorkspace.workspace) {
      throw new AppError(500, 'Workspace data is missing. Please contact support.');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      workspaceId: defaultWorkspace.workspaceId,
      role: defaultWorkspace.role,
    });

    const refreshToken = signRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
      workspace: {
        id: defaultWorkspace.workspace.id,
        name: defaultWorkspace.workspace.name,
        role: defaultWorkspace.role,
      },
      requiresPasswordChange: true,
      message: 'Password change required. Please change your password before continuing.',
    };
  }

  // Get default workspace (first workspace membership) - already declared above
  if (!defaultWorkspace) {
    // User has no workspace yet → issue provisional access token so they can create one
    const refreshToken = signRefreshToken(user.id);
    const provisionalAccessToken = signAccessToken({
      sub: user.id,
      workspaceId: '', // will be set after workspace creation
      role: 'ADMIN', // creator will become ADMIN of the new workspace
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: provisionalAccessToken,
      refreshToken,
      workspace: null,
      message: 'No workspace yet. Use this access token to create one.',
    };
  }

  // Generate tokens
  const accessToken = signAccessToken({
    sub: user.id,
    workspaceId: defaultWorkspace.workspaceId,
    role: defaultWorkspace.role,
  });

  const refreshToken = signRefreshToken(user.id);

  // Ensure workspace relation exists
  if (!defaultWorkspace.workspace) {
    throw new AppError(500, 'Workspace data is missing. Please contact support.');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    accessToken,
    refreshToken,
    workspace: {
      id: defaultWorkspace.workspace.id,
      name: defaultWorkspace.workspace.name,
      role: defaultWorkspace.role,
    },
  };
};

export const refreshAccessToken = async (refreshToken: string) => {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Get user with workspace
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'User not found');
  }

  const defaultWorkspace = user.memberships[0];

  if (!defaultWorkspace) {
    // Return provisional access token so client can call workspace create
    const provisionalAccessToken = signAccessToken({
      sub: user.id,
      workspaceId: '',
      role: 'ADMIN',
    });

    return {
      accessToken: provisionalAccessToken,
      workspace: null,
      message: 'No workspace yet. Use this access token to create one.',
    } as any;
  }

  // Generate new access token
  const accessToken = signAccessToken({
    sub: user.id,
    workspaceId: defaultWorkspace.workspaceId,
    role: defaultWorkspace.role,
  });

  return {
    accessToken,
    workspace: {
      id: defaultWorkspace.workspace.id,
      name: defaultWorkspace.workspace.name,
      role: defaultWorkspace.role,
    },
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      memberships: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              logo: true,
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
};

export const changePassword = async (userId: string, data: ChangePasswordInput) => {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Verify current password
  const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // Update password and clear mustChangePassword flag
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false as any,
      temporaryPassword: false as any,
    } as any,
  });

  return {
    message: 'Password changed successfully',
  };
};

/**
 * Complete member setup - change password and accept agreement
 */
export const completeMemberSetup = async (userId: string, data: CompleteMemberSetupInput) => {
  // Validate agreement acceptance
  if (!data.agreementAccepted) {
    throw new AppError(400, 'Agreement acceptance is required to complete setup');
  }

  // Get user with workspace memberships
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: {
          setupCompleted: false as any, // Type assertion until Prisma Client regenerates
        } as any,
        include: {
          workspace: true,
        },
      },
    },
  }) as any;

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Verify current password (temporary password)
  const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'Current password is incorrect');
  }

  // Check if user has pending setup
  if (user.memberships.length === 0) {
    throw new AppError(400, 'No pending setup found. Your account setup may already be completed.');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // Update user password and clear temporary flags
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false as any,
      temporaryPassword: false as any,
      emailVerified: true, // Auto-verify email for admin-created accounts
    } as any,
  });

  // Update all workspace memberships to mark setup as completed
  const now = new Date();
  await prisma.workspaceMember.updateMany({
    where: {
      userId,
      setupCompleted: false as any, // Type assertion until Prisma Client regenerates
    } as any,
    data: {
      setupCompleted: true as any,
      agreementAccepted: true as any,
      agreementAcceptedAt: now as any,
    } as any,
  });

  // Get updated memberships with workspace info
  const updatedMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Get default workspace (first one)
  const defaultWorkspace = updatedMemberships[0];

  if (!defaultWorkspace) {
    throw new AppError(404, 'No workspace membership found');
  }

  // Generate new access tokens with full workspace access
  const accessToken = signAccessToken({
    sub: user.id,
    workspaceId: defaultWorkspace.workspaceId,
    role: defaultWorkspace.role,
  });

  const refreshToken = signRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    accessToken,
    refreshToken,
    workspace: {
      id: defaultWorkspace.workspace.id,
      name: defaultWorkspace.workspace.name,
      role: defaultWorkspace.role,
    },
    message: 'Account setup completed successfully. You now have full access to your workspace.',
  };
};

/**
 * Verify user email address
 */
export const verifyEmail = async (data: VerifyEmailInput) => {
  // Validate token format (64 hex characters)
  const tokenRegex = /^[a-f0-9]{64}$/i;
  if (!tokenRegex.test(data.token)) {
    throw new AppError(400, 'Invalid token format');
  }

  // Find user by verification token
  const user = await prisma.user.findUnique({
    where: { verificationToken: data.token },
    select: {
      id: true,
      emailVerified: true,
      verificationToken: true,
      verificationTokenExpiresAt: true,
    },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired verification token');
  }

  // Check if token has expired
  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    throw new AppError(400, 'Verification token has expired. Please request a new one.');
  }

  // Check if already verified
  if (user.emailVerified) {
    // Clean up token even if already verified - use transaction to avoid race conditions
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
    } catch (error: any) {
      // If unique constraint error, user might have been updated by another request
      if (error?.code === 'P2002') {
        // Check if token was already cleared
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { verificationToken: true },
        });
        if (!updatedUser?.verificationToken) {
          // Token already cleared, return success
          return {
            message: 'Email address is already verified.',
          };
        }
      }
      // Re-throw if it's a different error
      throw error;
    }
    return {
      message: 'Email address is already verified.',
    };
  }

  // Use transaction with error handling to prevent race conditions and unique constraint errors
  try {
    await prisma.$transaction(async (tx) => {
      // Re-check if user is still unverified (race condition protection)
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true, verificationToken: true },
      });

      if (!currentUser) {
        throw new AppError(404, 'User not found');
      }

      if (currentUser.emailVerified) {
        // Already verified by another request - clean up and return
        await tx.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return;
      }

      // Update user - mark as verified
      // Only clear verificationToken if it exists (avoid null constraint issues)
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          // Only clear verificationToken if it exists (avoid null constraint issues)
          ...(currentUser.verificationToken && {
            verificationToken: null,
            verificationTokenExpiresAt: null,
          }),
        },
      });

      // Delete verification record
      await tx.emailVerification.deleteMany({
        where: {
          userId: user.id,
          purpose: EMAIL_VERIFICATION_PURPOSE,
        },
      });
    });
  } catch (error: any) {
    // Handle Prisma unique constraint errors (P2002)
    if (error?.code === 'P2002') {
      const constraintField = error?.meta?.target?.[0];
      
      // Check if user was actually verified by another concurrent request
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (updatedUser?.emailVerified) {
        // User was verified by another request - clean up and return success
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);

        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      }

      // Log the specific field causing the constraint error
      logger.error({ 
        error, 
        userId: user.id, 
        token: data.token.substring(0, 8) + '...',
        constraintField,
        errorMeta: error?.meta 
      }, 'Unique constraint error during email verification');

      // Provide more specific error message based on the field
      if (constraintField === 'email') {
        throw new AppError(409, 'An account with this email already exists. Please try logging in instead.');
      } else if (constraintField === 'verificationToken') {
        // For verificationToken, try again without setting it to null
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
          
          await prisma.emailVerification.deleteMany({
            where: {
              userId: user.id,
              purpose: EMAIL_VERIFICATION_PURPOSE,
            },
          }).catch(() => undefined);

          return {
            message: 'Email address verified successfully. You can now log in.',
          };
        } catch (retryError: any) {
          // If retry also fails, check if user is now verified
          const retryUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true },
          });

          if (retryUser?.emailVerified) {
            return {
              message: 'Email address verified successfully. You can now log in.',
            };
          }
          throw new AppError(409, 'Verification conflict. Please try again.');
        }
      } else {
        throw new AppError(409, 'Verification conflict. Please try again.');
      }
    }

    // Re-throw AppError instances
    if (error instanceof AppError) {
      throw error;
    }

    // Log and re-throw other errors
    logger.error({ error, userId: user.id }, 'Unexpected error during email verification');
    throw error;
  }

  return {
    message: 'Email address verified successfully. You can now log in.',
  };
};

export const verifyEmailOtp = async (data: VerifyEmailOtpInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return {
      message: 'If an account exists with this email, it has been verified or requires a new code.',
    };
  }

  if (user.emailVerified) {
    await prisma.emailVerification.deleteMany({
      where: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
      },
    });
    return {
      message: 'Email address is already verified.',
    };
  }

  const verification = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId: user.id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
      },
    },
  });

  if (!verification) {
    throw new AppError(400, 'Invalid or expired verification code. Please request a new one.');
  }

  const now = new Date();

  if (verification.expiresAt < now) {
    await prisma.emailVerification
      .delete({
        where: {
          userId_purpose: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        },
      })
      .catch(() => undefined);

    throw new AppError(400, 'Verification code has expired. Please request a new one.');
  }

  const isValid = await bcrypt.compare(data.otp, verification.codeHash);

  if (!isValid) {
    const updated = await prisma.emailVerification.update({
      where: {
        userId_purpose: {
          userId: user.id,
          purpose: EMAIL_VERIFICATION_PURPOSE,
        },
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
      select: {
        attempts: true,
      },
    });

    if (updated.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.emailVerification
        .delete({
          where: {
            userId_purpose: {
              userId: user.id,
              purpose: EMAIL_VERIFICATION_PURPOSE,
            },
          },
        })
        .catch(() => undefined);

      throw new AppError(400, 'Maximum attempts reached. Please request a new verification code.');
    }

    throw new AppError(400, 'Invalid verification code. Please try again.');
  }

  // Use transaction with error handling to prevent race conditions and unique constraint errors
  try {
    await prisma.$transaction(async (tx) => {
      // Re-check if user is still unverified (race condition protection)
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true, verificationToken: true },
      });

      if (!currentUser) {
        throw new AppError(404, 'User not found');
      }

      if (currentUser.emailVerified) {
        // Already verified by another request - this is fine, just clean up
        await tx.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return; // Exit early, will return success message below
      }

      // Update user - mark as verified
      // Don't set verificationToken to null to avoid unique constraint issues
      // The token will be cleared on next password reset or can be left as-is
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          // Only clear verificationToken if it exists (avoid null constraint issues)
          ...(currentUser.verificationToken && {
            verificationToken: null,
            verificationTokenExpiresAt: null,
          }),
        },
      });

      // Delete verification record
      await tx.emailVerification.delete({
        where: {
          userId_purpose: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        },
      });
    });
  } catch (error: any) {
    // Handle Prisma unique constraint errors (P2002)
    if (error?.code === 'P2002') {
      const constraintField = error?.meta?.target?.[0];
      
      // Check if user was actually verified by another concurrent request
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (updatedUser?.emailVerified) {
        // User was verified by another request - clean up and return success
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);

        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      }

      // Log the specific field causing the constraint error
      logger.error({ 
        error, 
        userId: user.id, 
        email: data.email,
        constraintField,
        errorMeta: error?.meta 
      }, 'Unique constraint error during email verification');

      // Provide more specific error message based on the field
      if (constraintField === 'email') {
        throw new AppError(409, 'An account with this email already exists. Please try logging in instead.');
      } else if (constraintField === 'verificationToken') {
        // For verificationToken, try again without setting it to null
        // This is a rare edge case, but we can handle it gracefully
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
          
          await prisma.emailVerification.deleteMany({
            where: {
              userId: user.id,
              purpose: EMAIL_VERIFICATION_PURPOSE,
            },
          }).catch(() => undefined);

          return {
            message: 'Email address verified successfully. You can now log in.',
          };
        } catch (retryError: any) {
          // If retry also fails, check if user is now verified
          const retryUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { emailVerified: true },
          });

          if (retryUser?.emailVerified) {
            return {
              message: 'Email address verified successfully. You can now log in.',
            };
          }
          throw new AppError(409, 'Verification conflict. Please try again.');
        }
      } else {
        throw new AppError(409, 'Verification conflict. Please try again.');
      }
    }

    // Re-throw AppError instances
    if (error instanceof AppError) {
      throw error;
    }

    // Log and re-throw other errors
    logger.error({ error, userId: user.id, email: data.email }, 'Unexpected error during email verification');
    throw error;
  }

  return {
    message: 'Email address verified successfully. You can now log in.',
  };
};

/**
 * ============================================
 * SIGNUP VERIFICATION - SEPARATE FLOW
 * ============================================
 * These functions are specifically for signup verification
 * and use SIGNUP_VERIFICATION_PURPOSE to avoid conflicts
 */

/**
 * Verify signup email with token (separate from general email verification)
 */
export const verifySignupEmail = async (data: VerifyEmailInput) => {
  // Validate token format (64 hex characters)
  const tokenRegex = /^[a-f0-9]{64}$/i;
  if (!tokenRegex.test(data.token)) {
    throw new AppError(400, 'Invalid token format');
  }

  // Find user by verification token
  const user = await prisma.user.findUnique({
    where: { verificationToken: data.token },
    select: {
      id: true,
      emailVerified: true,
      verificationToken: true,
      verificationTokenExpiresAt: true,
    },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired verification token');
  }

  // Check if token has expired
  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    throw new AppError(400, 'Verification token has expired. Please request a new one.');
  }

  // Check if already verified
  if (user.emailVerified) {
    // Clean up token and signup verification records
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
      await prisma.emailVerification.deleteMany({
        where: {
          userId: user.id,
          purpose: SIGNUP_VERIFICATION_PURPOSE,
        },
      }).catch(() => undefined);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { verificationToken: true },
        });
        if (!updatedUser?.verificationToken) {
          return {
            message: 'Email address is already verified.',
          };
        }
      }
      throw error;
    }
    return {
      message: 'Email address is already verified.',
    };
  }

  // Use transaction with error handling
  try {
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true, verificationToken: true },
      });

      if (!currentUser) {
        throw new AppError(404, 'User not found');
      }

      if (currentUser.emailVerified) {
        await tx.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return;
      }

      // Update user - mark as verified
      // CRITICAL: Do NOT set verificationToken to null - this causes unique constraint violations
      // Just mark email as verified and leave the token as-is
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          // Intentionally NOT setting verificationToken to null
        },
      });

      // Delete signup verification record only
      await tx.emailVerification.deleteMany({
        where: {
          userId: user.id,
          purpose: SIGNUP_VERIFICATION_PURPOSE,
        },
      });
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (updatedUser?.emailVerified) {
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      }

      logger.error({ 
        error, 
        userId: user.id, 
        token: data.token.substring(0, 8) + '...',
        constraintField: error?.meta?.target?.[0],
        errorMeta: error?.meta,
      }, 'Unique constraint error during signup verification');

      // Final check - is user already verified?
      const finalCheck = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (finalCheck?.emailVerified) {
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      }

      // If not verified, try one more time with just emailVerified update
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
        
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);

        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      } catch (retryError: any) {
        // Last check - maybe another request verified it
        const lastCheck = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });

        if (lastCheck?.emailVerified) {
          await prisma.emailVerification.deleteMany({
            where: {
              userId: user.id,
              purpose: SIGNUP_VERIFICATION_PURPOSE,
            },
          }).catch(() => undefined);
          return {
            message: 'Email address verified successfully. You can now log in.',
          };
        }

        // Log the retry error for debugging
        logger.error({ 
          retryError, 
          userId: user.id, 
          token: data.token.substring(0, 8) + '...',
          originalError: error 
        }, 'Failed to verify signup email after retry');
        
        throw new AppError(500, 'Unable to verify email at this time. Please try again or contact support.');
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ error, userId: user.id }, 'Unexpected error during signup verification');
    throw error;
  }

  return {
    message: 'Email address verified successfully. You can now log in.',
  };
};

/**
 * Verify signup email with OTP (separate from general email verification)
 */
export const verifySignupOtp = async (data: VerifyEmailOtpInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return {
      message: 'If an account exists with this email, it has been verified or requires a new code.',
    };
  }

  if (user.emailVerified) {
    await prisma.emailVerification.deleteMany({
      where: {
        userId: user.id,
        purpose: SIGNUP_VERIFICATION_PURPOSE,
      },
    });
    return {
      message: 'Email address is already verified.',
    };
  }

  // Look for signup verification record specifically
  const verification = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId: user.id,
        purpose: SIGNUP_VERIFICATION_PURPOSE,
      },
    },
  });

  if (!verification) {
    throw new AppError(400, 'Invalid or expired verification code. Please request a new one.');
  }

  const now = new Date();

  if (verification.expiresAt < now) {
    await prisma.emailVerification
      .delete({
        where: {
          userId_purpose: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        },
      })
      .catch(() => undefined);

    throw new AppError(400, 'Verification code has expired. Please request a new one.');
  }

  const isValid = await bcrypt.compare(data.otp, verification.codeHash);

  if (!isValid) {
    const updated = await prisma.emailVerification.update({
      where: {
        userId_purpose: {
          userId: user.id,
          purpose: SIGNUP_VERIFICATION_PURPOSE,
        },
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
      select: {
        attempts: true,
      },
    });

    if (updated.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.emailVerification
        .delete({
          where: {
            userId_purpose: {
              userId: user.id,
              purpose: SIGNUP_VERIFICATION_PURPOSE,
            },
          },
        })
        .catch(() => undefined);

      throw new AppError(400, 'Maximum attempts reached. Please request a new verification code.');
    }

    throw new AppError(400, 'Invalid verification code. Please try again.');
  }

  // Use transaction with error handling
  // CRITICAL: Do NOT set verificationToken to null - this causes unique constraint violations
  // Just mark email as verified and leave the token as-is
  try {
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (!currentUser) {
        throw new AppError(404, 'User not found');
      }

      if (currentUser.emailVerified) {
        await tx.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);
        return;
      }

      // Only update emailVerified - DO NOT touch verificationToken
      // This prevents unique constraint violations when multiple users have null tokens
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          // Intentionally NOT setting verificationToken to null
        },
      });

      await tx.emailVerification.delete({
        where: {
          userId_purpose: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        },
      });
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });

      if (updatedUser?.emailVerified) {
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);

        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      }

      logger.error({ 
        error, 
        userId: user.id, 
        email: data.email,
        constraintField: error?.meta?.target?.[0],
      }, 'Unique constraint error during signup OTP verification');

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
        
        await prisma.emailVerification.deleteMany({
          where: {
            userId: user.id,
            purpose: SIGNUP_VERIFICATION_PURPOSE,
          },
        }).catch(() => undefined);

        return {
          message: 'Email address verified successfully. You can now log in.',
        };
      } catch (retryError: any) {
        const retryUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });

        if (retryUser?.emailVerified) {
          return {
            message: 'Email address verified successfully. You can now log in.',
          };
        }
        throw new AppError(409, 'Verification conflict. Please try again.');
      }
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ error, userId: user.id, email: data.email }, 'Unexpected error during signup OTP verification');
    throw error;
  }

  return {
    message: 'Email address verified successfully. You can now log in.',
  };
};

/**
 * Resend signup verification email/OTP
 */
export const resendSignupVerification = async (data: ResendVerificationInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      verificationToken: true,
      verificationTokenExpiresAt: true,
    },
  });

  // Always return generic message to prevent email enumeration
  if (!user) {
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  if (user.emailVerified) {
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  const verificationToken = await ensureUserVerificationToken(user);

  // Check for existing signup verification record
  const existing = await prisma.emailVerification.findUnique({
    where: {
      userId_purpose: {
        userId: user.id,
        purpose: SIGNUP_VERIFICATION_PURPOSE,
      },
    },
  });

  const MIN_RETRY_INTERVAL_MS = OTP_RESEND_WINDOW_MINUTES * 60 * 1000;

  if (existing) {
    const timeSinceLastAttempt = new Date().getTime() - existing.createdAt.getTime();
    
    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
      const secondsRemaining = Math.ceil((MIN_RETRY_INTERVAL_MS - timeSinceLastAttempt) / 1000);
      const minutesRemaining = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      
      let errorMessage: string;
      if (minutesRemaining > 0) {
        errorMessage = `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds > 1 ? 's' : ''}` : ''} before requesting a new code.`;
      } else {
        errorMessage = `Please wait ${seconds} second${seconds > 1 ? 's' : ''} before requesting a new code.`;
      }
      
      const canRetryAt = new Date(existing.createdAt.getTime() + MIN_RETRY_INTERVAL_MS);
      
      throw new AppError(429, errorMessage, {
        retryAfter: secondsRemaining,
        canRetryAt: canRetryAt.toISOString(),
      });
    }
  }

  const otpCode = generateOtpCode();
  const codeHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

  try {
    await sendVerificationEmail(user.email, verificationToken, user.name || undefined, {
      otpCode,
      otpExpiresAt: expiresAt,
      isResend: true,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to send signup verification email');
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  // Update signup verification record
  await prisma.emailVerification.upsert({
    where: {
      userId_purpose: {
        userId: user.id,
        purpose: SIGNUP_VERIFICATION_PURPOSE,
      },
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: {
        increment: 1,
      },
      createdAt: new Date(),
    },
    create: {
      userId: user.id,
      purpose: SIGNUP_VERIFICATION_PURPOSE,
      codeHash,
      expiresAt,
      attempts: 0,
      resendCount: 1,
      createdAt: new Date(),
    },
  });

  return {
    message: 'If an account exists with this email, a verification email has been sent.',
    canRetryAfter: 120, // 2 minutes
  };
};

/**
 * ============================================
 * GENERAL EMAIL VERIFICATION (for existing users)
 * ============================================
 */

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (data: ResendVerificationInput) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      verificationToken: true,
      verificationTokenExpiresAt: true,
    },
  });

  // Security: Always return generic success message to prevent email enumeration
  // Don't reveal if user exists, doesn't exist, or is already verified
  if (!user) {
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  // If already verified, return generic message (don't reveal verification status)
  if (user.emailVerified) {
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  const verificationToken = await ensureUserVerificationToken(user);

  try {
    await issueEmailVerificationOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationToken,
      isResend: true,
    });
  } catch (error) {
    if (error instanceof AppError) {
      // If it's a rate limit error with retry metadata, preserve it
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    logger.error({ error, userId: user.id }, 'Failed to send verification email');
    // Return generic message even on error to prevent enumeration
    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }

  return {
    message: 'If an account exists with this email, a verification email has been sent.',
    canRetryAfter: 120, // 2 minutes
  };
};

export const resendVerificationOtp = async (data: ResendVerificationOtpInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      verificationToken: true,
      verificationTokenExpiresAt: true,
    },
  });

  if (!user) {
    return {
      message: 'If an account exists with this email, a verification code has been sent.',
    };
  }

  if (user.emailVerified) {
    throw new AppError(400, 'Email address is already verified');
  }

  const verificationToken = await ensureUserVerificationToken(user);

  try {
    await issueEmailVerificationOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationToken,
    });
  } catch (error) {
    if (error instanceof AppError) {
      // If it's a rate limit error with retry metadata, preserve it
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    logger.error({ error, userId: user.id }, 'Failed to send verification OTP');
    throw new AppError(500, 'Failed to send verification code. Please try again in 2 minutes.');
  }

  return {
    message: 'Verification code sent. Please check your inbox.',
    canRetryAfter: 120, // 2 minutes
  };
};

/**
 * Request OTP for password change
 */
export const requestPasswordChangeOtp = async (data: RequestPasswordChangeOtpInput, userId: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Verify that the email matches the logged-in user
  if (user.id !== userId) {
    throw new AppError(403, 'You can only request password change OTP for your own account');
  }

  // Check if user is email verified
  if (!user.emailVerified) {
    throw new AppError(400, 'Please verify your email address before changing your password');
  }

  try {
    await issuePasswordChangeOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      isResend: false,
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    logger.error({ error, userId: user.id }, 'Failed to send password change OTP');
    throw new AppError(500, 'Failed to send password change code. Please try again in 2 minutes.');
  }

  return {
    message: 'Password change code sent. Please check your inbox.',
    canRetryAfter: 120, // 2 minutes
  };
};

/**
 * Change password with OTP
 */
export const changePasswordWithOtp = async (data: ChangePasswordWithOtpInput, userId: string) => {
  // Find user by userId (this is for authenticated users)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Verify OTP
  await verifyOtpForPurpose(user.id, data.otp, PASSWORD_CHANGE_PURPOSE);

  // Hash new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // Update password and clear mustChangePassword flag
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false as any,
      temporaryPassword: false as any,
    } as any,
  });

  return {
    message: 'Password changed successfully',
  };
};

/**
 * Forgot password - request reset OTP
 */
export const forgotPassword = async (data: ForgotPasswordInput) => {
  // IMPORTANT: Verify user exists FIRST before attempting to send email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  // Return generic success message if user doesn't exist or email not verified
  // This prevents email enumeration attacks while avoiding unnecessary email sends
  if (!user || !user.emailVerified) {
    return {
      message: 'If an account exists with this email and is verified, a password reset code has been sent.',
    };
  }

  // User exists and is verified - now send email
  // issueResetPasswordOtp will verify email was sent before creating OTP record
  try {
    await issueResetPasswordOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      isResend: false,
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    // Enhanced error logging for email failures
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails: any = {
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      userId: user.id,
      email: user.email,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      isVercel: process.env.VERCEL === '1',
      nodeEnv: process.env.NODE_ENV,
    };
    
    // Add nodemailer-specific error details if available
    if (error && typeof error === 'object' && 'code' in error) {
      errorDetails.smtpErrorCode = (error as any).code;
      errorDetails.smtpCommand = (error as any).command;
      errorDetails.smtpResponse = (error as any).response;
      errorDetails.smtpResponseCode = (error as any).responseCode;
    }
    
    logger.error(errorDetails, 'Failed to send password reset OTP - check SMTP configuration');
    
    // Log more details in development or Vercel (for debugging)
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL === '1') {
      logger.error({ 
        fullError: error,
        hint: process.env.VERCEL === '1' 
          ? 'Check Vercel environment variables: SMTP_USER (or GMAIL_USER) and SMTP_PASS (or GMAIL_APP_PASSWORD) must be set in Vercel project settings'
          : 'Check your .env file for SMTP_USER (or GMAIL_USER) and SMTP_PASS (or GMAIL_APP_PASSWORD)',
        smtpUserSet: Boolean(process.env.SMTP_USER || process.env.GMAIL_USER),
        smtpPassSet: Boolean(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD),
      }, 'Email sending failed - detailed error information');
    }
    
    // Still return generic message to prevent enumeration
    return {
      message: 'If an account exists with this email and is verified, a password reset code has been sent.',
    };
  }

  return {
    message: 'If an account exists with this email and is verified, a password reset code has been sent.',
  };
};

/**
 * Reset password with OTP
 */
export const resetPassword = async (data: ResetPasswordInput) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Security: Only allow password reset for verified email addresses
  if (!user.emailVerified) {
    throw new AppError(403, 'Please verify your email address before resetting your password. Check your inbox for the verification link.');
  }

  // Verify OTP
  await verifyOtpForPurpose(user.id, data.otp, RESET_PASSWORD_PURPOSE);

  // Hash new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // Update password and clear mustChangePassword flag
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false as any,
      temporaryPassword: false as any,
    } as any,
  });

  // Security Note:
  // - Token invalidation: Refresh tokens are not stored in DB, so we cannot invalidate them on password reset.
  //   Consider implementing token storage if token invalidation on password change is required.
  // - Audit logging: Password reset is a user-level operation (not workspace-scoped), so it cannot be logged
  //   using the current AuditLog model which requires workspaceId. Consider adding user-level audit logging.

  return {
    message: 'Password reset successfully. You can now log in with your new password.',
  };
};

/**
 * Resend password change OTP
 */
export const resendPasswordChangeOtp = async (data: ResendPasswordChangeOtpInput, userId: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Verify that the email matches the logged-in user
  if (user.id !== userId) {
    throw new AppError(403, 'You can only request password change OTP for your own account');
  }

  // Check if user is email verified
  if (!user.emailVerified) {
    throw new AppError(400, 'Please verify your email address before changing your password');
  }

  try {
    await issuePasswordChangeOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      isResend: true,
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    logger.error({ error, userId: user.id }, 'Failed to resend password change OTP');
    throw new AppError(500, 'Failed to send password change code. Please try again in 2 minutes.');
  }

  return {
    message: 'Password change code sent. Please check your inbox.',
    canRetryAfter: 120, // 2 minutes
  };
};

/**
 * Resend reset password OTP
 */
export const resendResetPasswordOtp = async (data: ResendResetPasswordOtpInput) => {
  // Find user by email (don't reveal if user doesn't exist - security)
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });

  // Return generic success message regardless of whether user exists
  if (!user || !user.emailVerified) {
    return {
      message: 'If an account exists with this email and is verified, a password reset code has been sent.',
    };
  }

  try {
    await issueResetPasswordOtp({
      userId: user.id,
      email: user.email,
      name: user.name,
      isResend: true,
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 429 && error.metadata) {
        throw new AppError(429, error.message, error.metadata);
      }
      throw error;
    }
    logger.error({ error, userId: user.id }, 'Failed to resend password reset OTP');
    // Still return generic message to prevent enumeration
    return {
      message: 'If an account exists with this email and is verified, a password reset code has been sent.',
    };
  }

  return {
    message: 'If an account exists with this email and is verified, a password reset code has been sent.',
  };
};

