import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  invitationToken: z.string().optional(), // Optional invitation token for workspace invitation
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Add OTP validation regex
const otpRegex = /^\d{6}$/;

// Update VerifyEmailOtpInput schema to include OTP format validation
export const VerifyEmailOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(otpRegex, 'OTP must contain only digits'),
});

export const ResendVerificationOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const CompleteMemberSetupSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  agreementAccepted: z.boolean().refine((val) => val === true, {
    message: 'Agreement acceptance is required to complete setup',
  }),
});

export const RequestPasswordChangeOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ChangePasswordWithOtpSchema = z.object({
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(otpRegex, 'OTP must contain only digits'),
  newPassword: z.string().min(8),
  currentPassword: z.string(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(otpRegex, 'OTP must contain only digits'),
  newPassword: z.string().min(8),
});

export const ResendPasswordChangeOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResendResetPasswordOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type VerifyEmailOtpInput = z.infer<typeof VerifyEmailOtpSchema>;
export type ResendVerificationOtpInput = z.infer<typeof ResendVerificationOtpSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CompleteMemberSetupInput = z.infer<typeof CompleteMemberSetupSchema>;
export type RequestPasswordChangeOtpInput = z.infer<typeof RequestPasswordChangeOtpSchema>;
export type ChangePasswordWithOtpInput = z.infer<typeof ChangePasswordWithOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ResendPasswordChangeOtpInput = z.infer<typeof ResendPasswordChangeOtpSchema>;
export type ResendResetPasswordOtpInput = z.infer<typeof ResendResetPasswordOtpSchema>;

