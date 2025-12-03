// Password Management Types

export interface RequestPasswordChangeOtpPayload {
  email: string;
}

export interface RequestPasswordChangeOtpResponse {
  message: string;
  canRetryAfter: number; // seconds
}

export interface ChangePasswordOtpPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordOtpResponse {
  message: string;
}

export interface ResendPasswordChangeOtpPayload {
  email: string;
}

export interface ResendPasswordChangeOtpResponse {
  message: string;
  canRetryAfter: number; // seconds
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ResendResetPasswordOtpPayload {
  email: string;
}

export interface ResendResetPasswordOtpResponse {
  message: string;
}

// Legacy password change (deprecated, but may be needed)
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// Password strength types
export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

