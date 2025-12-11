"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type {
  RequestPasswordChangeOtpResponse,
  ChangePasswordOtpResponse,
  ResendPasswordChangeOtpResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ResendResetPasswordOtpResponse,
} from "@/types/password.types";

/**
 * Hook to request password change OTP
 */
export function useRequestPasswordChangeOtp() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string): Promise<RequestPasswordChangeOtpResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.requestPasswordChangeOtp(email);
        toast.success("Verification code sent to your email. Please check your inbox and spam folder.");
        return result;
      } catch (error: any) {
        console.error("Failed to request password change OTP:", error);
        const message = error?.message || "Failed to send verification code";

        // Handle rate limiting
        if (error?.statusCode === 429) {
          const retryAfter = error?.details?.retryAfter || error?.details?.canRetryAfter;
          if (retryAfter) {
            toast.error(`Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`);
          } else {
            toast.error("Too many requests. Please try again later.");
          }
        } else {
          toast.error(message);
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

/**
 * Hook to change password with OTP
 */
export function useChangePasswordWithOtp() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<ChangePasswordOtpResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.changePasswordWithOtp(email, otp, newPassword);
        toast.success("Password changed successfully");
        return result;
      } catch (error: any) {
        console.error("Failed to change password:", error);
        const message = error?.message || "Failed to change password";

        if (message.includes("OTP") || message.includes("code")) {
          toast.error("Invalid or expired verification code. Please request a new one.");
        } else if (message.includes("password")) {
          toast.error("Password does not meet requirements");
        } else {
          toast.error(message);
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

/**
 * Hook to resend password change OTP
 */
export function useResendPasswordChangeOtp() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string): Promise<ResendPasswordChangeOtpResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.resendPasswordChangeOtp(email);
        toast.success("Verification code sent to your email. Please check your inbox and spam folder.");
        return result;
      } catch (error: any) {
        console.error("Failed to resend password change OTP:", error);
        const message = error?.message || "Failed to resend verification code";

        // Handle rate limiting
        if (error?.statusCode === 429) {
          const retryAfter = error?.details?.retryAfter || error?.details?.canRetryAfter;
          if (retryAfter) {
            toast.error(`Please wait ${Math.ceil(retryAfter / 60)} minutes before requesting again.`);
          } else {
            toast.error("Please wait before requesting again.");
          }
        } else {
          toast.error(message);
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

/**
 * Hook to request forgot password OTP
 */
export function useForgotPassword() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string): Promise<ForgotPasswordResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.forgotPassword(email);
        // Generic message (email enumeration prevention)
        toast.success("If an account exists with this email, a password reset code has been sent. Please check your spam folder if you don't see it.");
        return result;
      } catch (error: any) {
        console.error("Failed to request password reset:", error);
        // Always show generic message
        toast.success("If an account exists with this email, a password reset code has been sent. Please check your spam folder if you don't see it.");

        // Still throw error for component handling, but don't show error to user
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

/**
 * Hook to reset password with OTP
 */
export function useResetPassword() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<ResetPasswordResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.resetPassword(email, otp, newPassword);
        toast.success("Password reset successfully. You can now log in with your new password.");
        return result;
      } catch (error: any) {
        console.error("Failed to reset password:", error);
        const message = error?.message || "Failed to reset password";

        if (message.includes("OTP") || message.includes("code")) {
          toast.error("Invalid or expired verification code. Please request a new one.");
        } else if (message.includes("password")) {
          toast.error("Password does not meet requirements");
        } else {
          toast.error(message);
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

/**
 * Hook to resend reset password OTP
 */
export function useResendResetPasswordOtp() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (email: string): Promise<ResendResetPasswordOtpResponse> => {
      setIsPending(true);
      try {
        const result = await apiClient.resendResetPasswordOtp(email);
        // Generic message
        toast.success("If an account exists with this email, a password reset code has been sent. Please check your spam folder if you don't see it.");
        return result;
      } catch (error: any) {
        console.error("Failed to resend reset password OTP:", error);

        // Handle rate limiting
        if (error?.statusCode === 429) {
          const retryAfter = error?.details?.retryAfter || error?.details?.canRetryAfter;
          if (retryAfter) {
            toast.error(`Please wait ${Math.ceil(retryAfter / 60)} minutes before requesting again.`);
          } else {
            toast.error("Please wait before requesting again.");
          }
        } else {
          // Generic message for security
          toast.success("If an account exists with this email, a password reset code has been sent. Please check your spam folder if you don't see it.");
        }

        throw error;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending };
}

