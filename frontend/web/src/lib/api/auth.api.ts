import { http, API_BASE_URL } from "./http";
import type {
  RequestPasswordChangeOtpPayload,
  RequestPasswordChangeOtpResponse,
  ChangePasswordOtpPayload,
  ChangePasswordOtpResponse,
  ResendPasswordChangeOtpPayload,
  ResendPasswordChangeOtpResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  ResendResetPasswordOtpPayload,
  ResendResetPasswordOtpResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from "@/types/password.types";

export const authApi = {
  refreshAccessToken(): Promise<void> {
    return http.refreshAccessToken();
  },

  login(body: { email: string; password: string }) {
    // Backend now returns only accessToken in body (refreshToken is set as httpOnly cookie)
    return http.request<{ accessToken: string; user: any; workspace: any }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  signup(body: { email: string; password: string; name?: string }) {
    return http.request<{
      user: {
        id: string;
        email: string;
        name: string | null;
        emailVerified: boolean;
        createdAt: string;
      };
      invitation: any | null;
      emailSent: boolean;
      message: string;
      actionRequired?: string[];
      retryAfter?: number;
      canRetryAt?: string;
      resendEndpoints?: {
        email: string;
        otp: string;
      };
    }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  verifyEmailOtp(body: { email: string; otp: string }) {
    return http.request<{ message: string }>("/auth/verify-email-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  logout() {
    // Call backend logout endpoint to clear httpOnly refresh token cookie
    return http.request<{ message: string }>("/auth/logout", { method: "POST" });
  },

  getMe() {
    return http.request<{
      id: string;
      email: string;
      name: string | null;
      isSuperAdmin?: boolean;
      createdAt: string;
      memberships?: Array<{
        workspace: { id: string; name: string; logo: string | null };
        role: string;
      }>;
    }>("/auth/me", { method: "GET" });
  },

  resendVerificationEmail(email: string) {
    return http.request<{ message: string; canRetryAfter: number }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resendVerificationOtp(body: { email: string }) {
    return http.request<{ message: string; canRetryAfter: number }>("/auth/resend-verification-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Signup-specific verification endpoints (separate from general verification)
  verifySignupOtp(body: { email: string; otp: string }) {
    return http.request<{ message: string }>("/auth/verify-signup-otp", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  resendSignupVerification(email: string) {
    return http.request<{ message: string; canRetryAfter?: number }>("/auth/resend-signup-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  updateMyProfile(data: { name?: string; email?: string }) {
    return http.request<{ id: string; name: string | null; email: string }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  exportMyAccountXlsx() {
    return http.requestBlob("/users/me/export", { method: "GET" });
  },

  deleteMyAccount() {
    return http.request<{ message: string }>("/users/me", { method: "DELETE" });
  },

  // Password Management methods
  changePassword(currentPassword: string, newPassword: string) {
    return http.request<ChangePasswordResponse>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword } as ChangePasswordPayload),
    });
  },

  requestPasswordChangeOtp(email: string) {
    return http.request<RequestPasswordChangeOtpResponse>("/auth/request-password-change-otp", {
      method: "POST",
      body: JSON.stringify({ email } as RequestPasswordChangeOtpPayload),
    });
  },

  changePasswordWithOtp(email: string, otp: string, newPassword: string) {
    return http.request<ChangePasswordOtpResponse>("/auth/change-password-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword } as ChangePasswordOtpPayload),
    });
  },

  resendPasswordChangeOtp(email: string) {
    return http.request<ResendPasswordChangeOtpResponse>("/auth/resend-password-change-otp", {
      method: "POST",
      body: JSON.stringify({ email } as ResendPasswordChangeOtpPayload),
    });
  },

  forgotPassword(email: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email } as ForgotPasswordPayload),
    }).then(async (res) => {
      if (!res.ok) throw await http.parseError(res);
      return res.json() as Promise<ForgotPasswordResponse>;
    });
  },

  resetPassword(email: string, otp: string, newPassword: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, otp, newPassword } as ResetPasswordPayload),
    }).then(async (res) => {
      if (!res.ok) throw await http.parseError(res);
      return res.json() as Promise<ResetPasswordResponse>;
    });
  },

  resendResetPasswordOtp(email: string) {
    // Public endpoint - no workspace header needed
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    return fetch(`${API_BASE_URL}/auth/resend-reset-password-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email } as ResendResetPasswordOtpPayload),
    }).then(async (res) => {
      if (!res.ok) throw await http.parseError(res);
      return res.json() as Promise<ResendResetPasswordOtpResponse>;
    });
  },
};
